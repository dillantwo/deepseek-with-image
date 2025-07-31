import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        messages: [
            {
                role: {type: String, required: true},
                content: {type: String, required: true},
                timestamp: {type: Number, required: true},
                images: [
                    {
                        name: {type: String},
                        url: {type: String}
                    }
                ]
            },
        ],
        userId: {type: String, required: true},
        chatflowId: {type: String, default: null}, // Associate with specific chatflow
    },
    {timestamps: true}
);

const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema)

export default Chat;