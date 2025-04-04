<template>
  <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
    <h2>🧪 수식 해설 요청</h2>
    <input
      v-model="formula"
      placeholder="예: H2 + O2 → H2O"
      style="width: 100%; padding: 10px; margin-bottom: 10px;"
    />
    <button @click="submitFormula" style="padding: 10px 20px;">해설 요청</button>

    <div v-if="result" style="margin-top: 20px; padding: 15px; background: #f4f4f4; border-radius: 8px;">
      <h3>🧠 GPT 해설 결과</h3>
      <p>{{ result }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const formula = ref('')
const result = ref('')

const submitFormula = async () => {
  if (!formula.value.trim()) return
  try {
    const res = await fetch('http://localhost:4000/api/formula/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ formula: formula.value })
    })
    const data = await res.json()
    result.value = data.result
  } catch (err) {
    result.value = '❌ 오류 발생: 서버에 연결할 수 없습니다.'
  }
}
</script>