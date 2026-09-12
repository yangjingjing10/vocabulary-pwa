import { computed, onMounted, ref } from 'vue'
import type { PromptConfig } from '@/db/schema/database'
import {
  createPromptConfig,
  deletePromptConfig,
  duplicatePromptConfig,
  getAllPromptConfigs,
  savePromptConfig,
  setActivePromptConfig
} from '@/db/repositories/prompt-config.repository'

export function usePromptConfigs(showToast: (message: string, type?: 'success' | 'error') => void) {
  const configs = ref<PromptConfig[]>([])
  const selectedConfigId = ref<string | null>(null)
  const showDeleteConfirm = ref(false)
  const configToDelete = ref<string | null>(null)

  const selectedConfig = computed(() => {
    if (!selectedConfigId.value) return null
    return configs.value.find(c => c.id === selectedConfigId.value) || null
  })

  const activeConfig = computed(() => {
    return configs.value.find(c => c.isActive) || null
  })

  async function loadConfigs() {
    try {
      configs.value = await getAllPromptConfigs()
      configs.value.sort((a, b) => b.updatedAt - a.updatedAt)
      
      if (configs.value.length > 0 && !selectedConfigId.value) {
        const active = configs.value.find(c => c.isActive)
        selectedConfigId.value = active?.id || configs.value[0].id
      }
    } catch (error) {
      console.error('Failed to load configs:', error)
      showToast('Failed to load configs', 'error')
    }
  }

  function selectConfig(id: string) {
    selectedConfigId.value = id
  }

  async function createNewConfig() {
    try {
      const newConfig = await createPromptConfig({
        name: 'New Prompt Config',
        content: '',
        isActive: false
      })
      configs.value.unshift(newConfig)
      selectedConfigId.value = newConfig.id
      showToast('Config created')
    } catch (error) {
      console.error('Failed to create config:', error)
      showToast('Failed to create config', 'error')
    }
  }

  async function saveConfig(id: string, name: string, content: string, isActive: boolean) {
    if (!name.trim()) {
      showToast('Config name required', 'error')
      return false
    }
    
    try {
      await savePromptConfig({ id, name, content, isActive })
      
      const index = configs.value.findIndex(c => c.id === id)
      if (index !== -1) {
        configs.value[index].name = name
        configs.value[index].content = content
        configs.value[index].updatedAt = Date.now()
      }
      
      showToast('Config saved')
      return true
    } catch (error) {
      console.error('Failed to save config:', error)
      showToast('Failed to save config', 'error')
      return false
    }
  }

  async function setAsActive(id: string) {
    try {
      await setActivePromptConfig(id)
      
      configs.value.forEach(c => {
        c.isActive = c.id === id
      })
      
      showToast('Set as active config')
    } catch (error) {
      console.error('Failed to set active:', error)
      showToast('Failed to set active', 'error')
    }
  }

  async function duplicateConfig(id: string) {
    try {
      const duplicate = await duplicatePromptConfig(id)
      if (duplicate) {
        configs.value.unshift(duplicate)
        selectedConfigId.value = duplicate.id
        showToast('Config duplicated')
      }
    } catch (error) {
      console.error('Failed to duplicate config:', error)
      showToast('Failed to duplicate', 'error')
    }
  }

  function confirmDelete(id: string) {
    configToDelete.value = id
    showDeleteConfirm.value = true
  }

  async function performDelete() {
    if (!configToDelete.value) return
    
    const idToDelete = configToDelete.value
    
    try {
      await deletePromptConfig(idToDelete)
      
      const index = configs.value.findIndex(c => c.id === idToDelete)
      configs.value.splice(index, 1)
      
      if (selectedConfigId.value === idToDelete) {
        selectedConfigId.value = configs.value.length > 0 ? configs.value[0].id : null
      }
      
      showToast('Config deleted')
    } catch (error) {
      console.error('Failed to delete config:', error)
      showToast('Failed to delete', 'error')
    } finally {
      showDeleteConfirm.value = false
      configToDelete.value = null
    }
  }

  function cancelDelete() {
    showDeleteConfirm.value = false
    configToDelete.value = null
  }

  onMounted(async () => {
    await loadConfigs()
  })

  return {
    configs,
    selectedConfigId,
    selectedConfig,
    activeConfig,
    showDeleteConfirm,
    loadConfigs,
    selectConfig,
    createNewConfig,
    saveConfig,
    setAsActive,
    duplicateConfig,
    confirmDelete,
    performDelete,
    cancelDelete
  }
}
