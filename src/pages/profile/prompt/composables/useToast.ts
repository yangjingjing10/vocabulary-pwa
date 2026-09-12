import { ref } from 'vue'
import type { ToastType } from '../types'

export function useToast() {
  const toastMessage = ref('')
  const toastType = ref<ToastType>('success')

  function showToast(message: string, type: ToastType = 'success') {
    toastMessage.value = message
    toastType.value = type
    window.setTimeout(() => {
      toastMessage.value = ''
    }, 2500)
  }

  return {
    toastMessage,
    toastType,
    showToast
  }
}
