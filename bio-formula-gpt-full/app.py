
import gradio as gr
import openai

openai.api_key = "your-openai-api-key"

def explain_formula(formula):
    prompt = f"다음 수식의 의미를 한국어로 설명해주세요:\n\n{formula}"
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{ "role": "user", "content": prompt }]
    )
    return response.choices[0].message.content.strip()

iface = gr.Interface(fn=explain_formula,
                     inputs="text",
                     outputs="text",
                     title="🧬 수식 해설 AI",
                     description="DNA, 화학 반응식 등 과학 수식을 GPT가 설명해줍니다.")
iface.launch()
