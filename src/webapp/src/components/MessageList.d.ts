import { MessageObject } from "@/routes/Chat";
interface MessageListProps {
    messages: MessageObject[];
    setMessageRating: (message: MessageObject, newRating: number) => void;
}
export default function MessageList({ messages, setMessageRating, }: MessageListProps): any;
export {};
