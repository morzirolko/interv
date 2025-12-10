<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'

interface Company {
  ID: string
  TITLE: string
}

interface ApiResponse {
  success: boolean
  count?: number
  data?: Company[]
  error?: string
}

const companies = ref<Company[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const itemsPerPage = 50
const limit = ref(50)

const totalPages = computed(() => Math.ceil(companies.value.length / itemsPerPage))

const paginatedCompanies = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return companies.value.slice(start, start + itemsPerPage)
})

async function loadCompanies() {
  loading.value = true
  error.value = null
  companies.value = []
  currentPage.value = 1

  try {
    const response = await axios.get<ApiResponse>('http://localhost:3001/api/companies', {
      params: { limit: limit.value }
    })

    if (response.data.success && response.data.data) {
      companies.value = response.data.data
    } else {
      error.value = response.data.error || 'Неизвестная ошибка'
    }
  } catch (err) {
    const e = err as Error
    error.value = e.message || 'Ошибка при загрузке данных'
  } finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function changeLimit() {
  if (limit.value === 50) {
    limit.value = 500
  } else if (limit.value === 500) {
    limit.value = 0
  } else {
    limit.value = 50
  }
  console.log(limit.value)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 p-8">
    <div class="max-w-4xl mx-auto">
      <header class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
     Компании
        </h1>
        <p class="text-gray-400">Загрузка компаний через REST</p>
      </header>

      <div class="flex justify-center gap-2 mb-8">
        <button class="px-8 py-4 bg-slate-500 border-2 border-slate-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-500/30 hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          @click="changeLimit"
        >Ограничение:
          <span v-if="limit === 0">Нет</span>
          <span v-else>{{ limit }}</span>
        </button>
        <button
          @click="loadCompanies"
          :disabled="loading"
          class="px-8 py-4 bg-purple-500 border-2 border-purple-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-500/30 hover:bg-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span v-if="loading" class="flex items-center gap-3">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Загрузка...
          </span>
          <span v-else>Загрузить компании</span>
        </button>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center">
        {{ error }}
      </div>

      <div v-if="companies.length > 0" class="mb-6 flex justify-center gap-6">
        <div class="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <span class="text-gray-400">Всего:</span>
          <span class="ml-2 text-white font-bold">{{ companies.length.toLocaleString() }}</span>
        </div>
        <div class="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <span class="text-gray-400">Страница:</span>
          <span class="ml-2 text-white font-bold">{{ currentPage }} / {{ totalPages }}</span>
        </div>
      </div>

      <main v-if="companies.length > 0" class="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <table class="divide-y divide-white/10 grid">
          <thead class="px-6 py-4 hover:bg-white/5 transition-colors flex text-left gap-4">
            <th class="text-gray-500 text-sm w-16 border-r-1">ID</th>
            <th class="text-gray-500 text-sm w-16 ">Название</th>
          </thead>
          <tbody   
          v-for="company in paginatedCompanies" 
          :key="company.ID"
          class="px-6 py-4 hover:bg-white/5 transition-colors flex items-center gap-4"
          >
            <td class="text-gray-500 text-sm w-16 border-r-1">{{ company.ID }}</td>
            <td class="text-white font-medium">{{ company.TITLE }}</td>
        </tbody>
        </table>

        <!-- Pagination -->
        <nav class="px-6 py-4 bg-white/5 flex justify-center-safe  gap-4">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class=" w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-0 disabled:cursor-hidden transition-colors"
          >
            ←
          </button>
          <button
            @click="goToPage(1)"
            :disabled="currentPage === 1"
            class=" w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-0 disabled:cursor-hidden transition-colors"
          >
            1
          </button>
          <span class="w-10 h-10 rounded-full text-white font-semibold border border-white/20 flex items-center justify-center">{{ currentPage }}</span>
          <button
            @click="goToPage(totalPages)"
            :disabled="currentPage === totalPages"
            class=" w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-0 disabled:cursor-hidden transition-colors"
          >
            {{ totalPages }}
          </button>
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-2 w-10 h-10 rounded-full bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-0 disabled:cursor-hidden transition-colors"
          >
            →
          </button>
        </nav>
      </main>
    </div>
  </div>
</template>
