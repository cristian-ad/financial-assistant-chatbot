import { MessageObject } from "@/routes/Chat";
interface MessageActionsProps {
    message: MessageObject;
    setMessageRating: (message: MessageObject, rating: number) => void;
}
export default function MessageActions({ message, setMessageRating, }: MessageActionsProps): any;
export {};
