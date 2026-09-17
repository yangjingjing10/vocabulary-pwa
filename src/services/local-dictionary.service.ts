import type {

  LocalDictEntry,

  LocalExampleItem,

  LocalLookalikeItem,

  LocalPhraseItem,

} from '@/db/schema/database'

import {

  bulkPutLocalDict,

  bulkPutLocalExampleIndex,

  bulkPutLocalLookalikeIndex,

  bulkPutLocalPhraseIndex,

  getLocalDictEntry,

  getLocalDictMeta,

  getLocalExamplesForWord,

  getLocalLookalikesForWord,

  getLocalPhrasesForWord,

} from '@/db/repositories/local-dict.repository'



/** 与 public/dict/ecdict-core.json 的 v 字段对齐；升级精简包时递增 */

export const LOCAL_DICT_PACK_VERSION = 2

export const LOCAL_DICT_URL = '/dict/ecdict-core.json'



/** 与 public/dict/ecdict-phrases.json 的 v 字段对齐 */

export const LOCAL_PHRASE_PACK_VERSION = 2

export const LOCAL_PHRASE_URL = '/dict/ecdict-phrases.json'



/** 与 public/dict/ecdict-lookalikes.json 的 v 字段对齐 */

export const LOCAL_LOOKALIKE_PACK_VERSION = 1

export const LOCAL_LOOKALIKE_URL = '/dict/ecdict-lookalikes.json'



/** 与 public/dict/ecdict-examples.json 的 v 字段对齐 */

export const LOCAL_EXAMPLE_PACK_VERSION = 1

export const LOCAL_EXAMPLE_URL = '/dict/ecdict-examples.json'



type PackPayload = {

  v: number

  source?: string

  count: number

  entries: [string, string, string, string, string][]

}



type PhrasePackPayload = {

  v: number

  source?: string

  phraseCount?: number

  wordCount?: number

  index: [string, [string, string][]][]

}



type LookalikePackPayload = {

  v: number

  source?: string

  wordCount?: number

  index: [string, [string, string, string][]][]

}



type ExamplePackPayload = {

  v: number

  source?: string

  wordCount?: number

  index: [string, [string, string][]][]

}



let ensurePromise: Promise<boolean> | null = null

/** 本会话已确认附属包不可用，避免每次查词重复 404 */

let phrasePackUnavailable = false

let lookalikePackUnavailable = false

let examplePackUnavailable = false



function normalizeWord(word: string): string {

  return word.toLowerCase().trim().replace(/[.,!?;:"'()[\]{}]/g, '')

}



/** 首次打开时从静态资源导入精简词库到 IndexedDB（每台设备各导入一次） */

export async function ensureLocalDictionary(

  onProgress?: (done: number, total: number) => void,

): Promise<boolean> {

  if (!ensurePromise) {

    ensurePromise = doEnsure(onProgress).then(

      (ok) => {

        if (!ok) ensurePromise = null

        return ok

      },

      (err) => {

        ensurePromise = null

        throw err

      },

    )

  }

  return ensurePromise

}



async function doEnsure(onProgress?: (done: number, total: number) => void): Promise<boolean> {

  const meta = await getLocalDictMeta()

  const coreReady = !!(meta && meta.version >= LOCAL_DICT_PACK_VERSION && meta.count > 0)

  const phrasesReady = !!(meta && (meta.phraseVersion ?? 0) >= LOCAL_PHRASE_PACK_VERSION)

  const lookalikesReady = !!(meta && (meta.lookalikeVersion ?? 0) >= LOCAL_LOOKALIKE_PACK_VERSION)

  const examplesReady = !!(meta && (meta.exampleVersion ?? 0) >= LOCAL_EXAMPLE_PACK_VERSION)



  if (

    coreReady &&

    (phrasesReady || phrasePackUnavailable) &&

    (lookalikesReady || lookalikePackUnavailable) &&

    (examplesReady || examplePackUnavailable)

  ) {

    return true

  }



  let ok = coreReady



  if (!coreReady) {

    ok = await importCorePack(onProgress)

  }



  if (!phrasesReady && !phrasePackUnavailable) {

    await importPhrasePack()

  }



  if (!lookalikesReady && !lookalikePackUnavailable) {

    await importLookalikePack()

  }



  if (!examplesReady && !examplePackUnavailable) {

    await importExamplePack()

  }



  return ok

}



async function importCorePack(

  onProgress?: (done: number, total: number) => void,

): Promise<boolean> {

  const response = await fetch(LOCAL_DICT_URL)

  if (!response.ok) {

    console.error('[local-dict] failed to fetch pack:', response.status)

    return false

  }



  const pack = (await response.json()) as PackPayload

  if (!pack?.entries?.length) {

    console.error('[local-dict] empty pack')

    return false

  }



  const entries: LocalDictEntry[] = pack.entries.map(([word, phonetic, translation, pos, tag]) => ({

    word,

    phonetic: phonetic || '',

    translation: translation || '',

    pos: pos || '',

    tag: tag || '',

  }))



  await bulkPutLocalDict(

    entries,

    {

      version: pack.v || LOCAL_DICT_PACK_VERSION,

      count: entries.length,

      importedAt: Date.now(),

      source: pack.source || 'ECDICT',

      phraseVersion: 0,

      phraseWordCount: 0,

      lookalikeVersion: 0,

      lookalikeWordCount: 0,

      exampleVersion: 0,

      exampleWordCount: 0,

    },

    onProgress,

  )



  console.log(`[local-dict] imported ${entries.length} entries`)

  return true

}



async function importPhrasePack(): Promise<boolean> {

  try {

    const response = await fetch(LOCAL_PHRASE_URL)

    if (!response.ok) {

      phrasePackUnavailable = true

      console.warn('[local-dict] phrase pack not found:', response.status)

      return false

    }



    const pack = (await response.json()) as PhrasePackPayload

    if (!pack?.index?.length) {

      phrasePackUnavailable = true

      console.warn('[local-dict] empty phrase pack')

      return false

    }



    const entries = pack.index.map(([word, phrases]) => ({

      word,

      phrases: phrases.map(([phrase, translation]) => ({

        phrase,

        translation: translation || '',

      })),

    }))



    await bulkPutLocalPhraseIndex(entries, {

      phraseVersion: pack.v || LOCAL_PHRASE_PACK_VERSION,

      phraseWordCount: entries.length,

    })



    phrasePackUnavailable = false

    console.log(`[local-dict] imported phrases for ${entries.length} words`)

    return true

  } catch (error) {

    phrasePackUnavailable = true

    console.warn('[local-dict] phrase import skipped:', error)

    return false

  }

}



async function importLookalikePack(): Promise<boolean> {

  try {

    const response = await fetch(LOCAL_LOOKALIKE_URL)

    if (!response.ok) {

      lookalikePackUnavailable = true

      console.warn('[local-dict] lookalike pack not found:', response.status)

      return false

    }



    const pack = (await response.json()) as LookalikePackPayload

    if (!pack?.index?.length) {

      lookalikePackUnavailable = true

      console.warn('[local-dict] empty lookalike pack')

      return false

    }



    const entries = pack.index.map(([word, items]) => ({

      word,

      items: items.map(([w, translation, pos]) => ({

        word: w,

        translation: translation || '',

        pos: pos || '',

      })),

    }))



    await bulkPutLocalLookalikeIndex(entries, {

      lookalikeVersion: pack.v || LOCAL_LOOKALIKE_PACK_VERSION,

      lookalikeWordCount: entries.length,

    })



    lookalikePackUnavailable = false

    console.log(`[local-dict] imported lookalikes for ${entries.length} words`)

    return true

  } catch (error) {

    lookalikePackUnavailable = true

    console.warn('[local-dict] lookalike import skipped:', error)

    return false

  }

}



async function importExamplePack(): Promise<boolean> {

  try {

    const response = await fetch(LOCAL_EXAMPLE_URL)

    if (!response.ok) {

      examplePackUnavailable = true

      console.warn('[local-dict] example pack not found:', response.status)

      return false

    }



    const pack = (await response.json()) as ExamplePackPayload

    if (!pack?.index?.length) {

      examplePackUnavailable = true

      console.warn('[local-dict] empty example pack')

      return false

    }



    const entries = pack.index.map(([word, examples]) => ({

      word,

      examples: examples.map(([sentence, translation]) => ({

        sentence,

        translation: translation || '',

      })),

    }))



    await bulkPutLocalExampleIndex(entries, {

      exampleVersion: pack.v || LOCAL_EXAMPLE_PACK_VERSION,

      exampleWordCount: entries.length,

    })



    examplePackUnavailable = false

    console.log(`[local-dict] imported examples for ${entries.length} words`)

    return true

  } catch (error) {

    examplePackUnavailable = true

    console.warn('[local-dict] example import skipped:', error)

    return false

  }

}



export async function lookupLocalDictionary(word: string): Promise<LocalDictEntry | null> {

  const key = normalizeWord(word)

  if (!key) return null



  const exact = await getLocalDictEntry(key)

  if (exact) return exact



  const candidates = stemCandidates(key)

  for (const c of candidates) {

    const hit = await getLocalDictEntry(c)

    if (hit) return hit

  }

  return null

}



/** 查某词相关的短语/固定搭配（含简单词形还原） */

export async function lookupLocalPhrases(word: string): Promise<LocalPhraseItem[]> {

  const key = normalizeWord(word)

  if (!key) return []



  const exact = await getLocalPhrasesForWord(key)

  if (exact.length) return exact



  for (const c of stemCandidates(key)) {

    const hit = await getLocalPhrasesForWord(c)

    if (hit.length) return hit

  }

  return []

}



/** 查形近词（adapt / adopt / adept） */

export async function lookupLocalLookalikes(word: string): Promise<LocalLookalikeItem[]> {

  const key = normalizeWord(word)

  if (!key) return []

  return getLocalLookalikesForWord(key)

}



/** 查本地例句（Tatoeba）；含简单词形还原 */

export async function lookupLocalExamples(word: string): Promise<LocalExampleItem[]> {

  const key = normalizeWord(word)

  if (!key) return []



  const exact = await getLocalExamplesForWord(key)

  if (exact.length) return exact



  for (const c of stemCandidates(key)) {

    const hit = await getLocalExamplesForWord(c)

    if (hit.length) return hit

  }

  return []

}



function stemCandidates(word: string): string[] {

  const out: string[] = []

  if (word.endsWith('ies') && word.length > 4) out.push(word.slice(0, -3) + 'y')

  if (word.endsWith('es') && word.length > 3) out.push(word.slice(0, -2))

  if (word.endsWith('s') && word.length > 2) out.push(word.slice(0, -1))

  if (word.endsWith('ing') && word.length > 5) {

    out.push(word.slice(0, -3))

    out.push(word.slice(0, -3) + 'e')

  }

  if (word.endsWith('ed') && word.length > 3) {

    out.push(word.slice(0, -2))

    out.push(word.slice(0, -1))

  }

  return [...new Set(out)]

}


