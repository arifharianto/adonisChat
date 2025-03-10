import { BaseModel, column } from '@zakodium/adonis-mongodb'

export default class Message extends BaseModel {
    @column({ isPrimary: true })
    public id: string

    @column()
    public user_message: string

    @column()
    public ai_response: string
}
