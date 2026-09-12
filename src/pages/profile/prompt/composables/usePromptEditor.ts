import { ref, watch } from 'vue'
import type { PromptConfig } from '@/db/schema/database'
import type { EditForm } from '../types'

export function usePromptEditor(
  selectedConfig: () => PromptConfig | null,
  showToast: (message: string, type?: 'success' | 'error') => void
) {
  const editForm = ref<EditForm>({
    name: '',
    content: ''
  })

  function loadEditForm() {
    const config = selectedConfig()
    if (config) {
      editForm.value.name = config.name
      editForm.value.content = config.content
    } else {
      editForm.value.name = ''
      editForm.value.content = ''
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    
    if (!file) return
    
    const validExtensions = ['.txt', '.md']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      showToast('Only .txt and .md files supported', 'error')
      input.value = ''
      return
    }
    
    try {
      const text = await file.text()
      editForm.value.content = text
      
      if (!editForm.value.name || editForm.value.name === 'New Prompt Config') {
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'))
        editForm.value.name = baseName
      }
      
      showToast('File loaded successfully')
    } catch (error) {
      console.error('Failed to read file:', error)
      showToast('Failed to read file', 'error')
    } finally {
      input.value = ''
    }
  }

  watch(selectedConfig, () => {
    loadEditForm()
  }, { immediate: true })

  return {
    editForm,
    loadEditForm,
    handleFileUpload
  }
}
