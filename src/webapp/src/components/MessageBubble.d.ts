import { MessageObject } from "@/routes/Chat";
export interface MessageBubbleProps {
    message: MessageObject;
    setMessageRating: (message: MessageObject, rating: number) => void;
}
export default function MessageBubble({ message, setMessageRating, }: MessageBubbleProps): any;
