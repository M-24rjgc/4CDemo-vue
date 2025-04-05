import { ref } from 'vue'
import { defineStore } from 'pinia'

export type AppMode = 'simulation' | 'ai'

export const useAppModeStore = defineStore('appMode', () => {
  // 默认为模拟模式
  const mode = ref<AppMode>('simulation')

  // 切换模式
  function setMode(newMode: AppMode) {
    mode.value = newMode
  }

  // 判断当前是否为AI模式
  const isAiMode = () => mode.value === 'ai'

  // 判断当前是否为模拟模式
  const isSimulationMode = () => mode.value === 'simulation'

  return {
    mode,
    setMode,
    isAiMode,
    isSimulationMode
  }
})
