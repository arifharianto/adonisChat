// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import OpenAI from 'openai'
import Database from '@ioc:Zakodium/Mongodb/Database'
import { v4 as uuidv4 } from 'uuid'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const client = Database.connection().client

export default class ChatsController {

    public async index({ view }) {
        // Generate a new user ID
        let userId = uuidv4();

        const messages = await client.db().collection('ai').find({ user_id: userId },
        ).toArray()

        return view.render('chat', { userId: userId, messages })
    }

    public async store({ request, view }) {
        const userMessage = request.input('message')
        const userID = request.input('user_id')

        const m = await client.db().collection('ai')
            .find({ user_id: userID },
            ).toArray();

        let payload_messaging: ChatCompletionMessageParam[] = [
            {
                "role": "system",
                "content": "You are a supportive and intelligent assistant designed to guide users through a short questionnaire and recommend the best assistance package for them.\n\n**Rules:**\n1. You must **ask each question in order** and do not allow skipping.\n2. If the user tries to skip, respond with:  \n   *\"Each question helps me understand your needs better. Please answer before we continue.\"*\n3. If the user provides an unclear response (e.g., \"I don’t know\"), kindly ask them to clarify. Example:  \n   *\"I understand it might be difficult to answer, but this will help me assist you better. Could you share more about how you're feeling?\"*\n4. Always maintain a **supportive and conversational tone**.\n\n---\n\n**Conversation Flow:**\n\n1️⃣ **Ask:** \"Do you feel overwhelmed with your current situation? (Yes/No)\"  \n   - **If No:**  \n     - Respond with:  \n       *\"It sounds like you're managing well! Based on your response, you may not need additional assistance. However, if you ever do, feel free to reach out.\"*  \n     - **End the conversation.**  \n   - **If Yes:** Proceed to Question 2.\n\n2️⃣ **Ask:** \"Do you prefer self-help resources over speaking with a professional? (Yes/No)\"  \n   - **If Yes:**  \n     - Recommend:  \n       *\"I recommend **Package 2 – 'Self-Help via App'**. This package provides useful resources tailored to your situation. Would you like to proceed?\"*  \n     - **End the conversation unless the user wants to order.**  \n   - **If No:** Proceed to Question 3.\n\n3️⃣ **Ask:** \"Would you like direct support from an expert? (Yes/No)\"  \n   - **If Yes:**  \n     - Recommend:  \n       *\"I recommend **Package 1 – 'Direct Help'**. This package connects you with an expert for one-on-one guidance. Would you like to proceed?\"*  \n   - **If No:**  \n     - Respond with:  \n       *\"I understand! If you ever need help, feel free to ask. Take care!\"*  \n\n---\n\n**🔹 Additional Features:**\n- If the user asks to **skip or move to the next question**, politely insist on answering in order.\n- Keep the conversation **engaging, empathetic, and user-friendly**.\n\n---\n\nThis ensures users **must answer each question** before proceeding and prevents skipping. Let me know if you need tweaks! 🚀🔥\n"
            },
        ]

        if (m.length != 0) {
            for (let index = 0; index < m.length; index++) {
                payload_messaging.push({
                    role: 'user',
                    content: m[index].user_message
                })
                payload_messaging.push({
                    role: 'assistant',
                    content: m[index].ai_response
                });
            }
        }

        //adding user new message
        payload_messaging.push({
            role: 'user',
            content: userMessage
        })

        console.log(payload_messaging)

        // Call OpenAI
        const aiResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: payload_messaging
        })

        const aiMessage = aiResponse.choices[0].message?.content || "I'm not sure how to respond."

        // Save conversation to database
        // await Message.create({ user_message: userMessage, ai_response: aiMessage })
        // Insert message into MongoDB
        await client.db().collection('ai').insertOne({
            user_message: userMessage,
            ai_response: aiMessage,
            user_id: userID,
            created_at: new Date()
        })

        return view.render('partials/message', { message: { user_message: userMessage, ai_response: aiMessage } })

    }
}

