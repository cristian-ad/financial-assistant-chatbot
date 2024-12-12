import { MessageObject } from "@routes/Chat";
export interface MessagesState {
    messages: MessageObject[];
}
interface AddMessage {
    message: MessageObject;
}
interface ModifyMessage {
    messageId: string;
    text: string;
}
interface ModifyRating {
    messageId: string;
    rating: number;
}
interface ModifySources {
    messageId: string;
    sources: string[];
}
interface ModifyStatus {
    messageId: string;
    status: string[];
}
export interface MessagesAction {
    type: "ADD_MESSAGE" | "MODIFY_MESSAGE" | "MODIFY_RATING" | "MODIFY_SOURCES" | "MODIFY_STATUS";
    payload: AddMessage | ModifyMessage | ModifyRating | ModifySources | ModifyStatus;
}
export declare function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState;
export {};
