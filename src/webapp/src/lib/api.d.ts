export type RatingObject = {
    session_id: string;
    question: string;
    answer: string;
    author: string;
    timestamp: string | number;
    rating: string | number;
};
export type QueryObject = {
    query: string;
    session_id: string;
};
export declare function postQuery(query: QueryObject): Promise<null>;
export declare function postRating(rating: RatingObject): Promise<null>;
export declare function getItems(): Promise<null>;
export declare function interact(query: QueryObject): Promise<AsyncIterable<import("@aws-sdk/client-lambda").InvokeWithResponseStreamResponseEvent> | undefined>;
