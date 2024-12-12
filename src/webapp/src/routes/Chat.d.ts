export type MessageObject = {
    id: string;
    content: string;
    message_type: string;
    author?: string;
    sources?: string[];
    status?: string[];
    timestamp?: string | number;
    question?: string;
    rating?: string | number;
    session_id?: string;
};
export default function Chat(): any;
