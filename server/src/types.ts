export interface RejectionRow {
    email_date: string;
    vacancy: string;
    company: string;
}

export interface InsertRejectionInput {
    email_date: string;
    vacancy: string;
    company: string;
    github_url?: string | null;
    note?: string | null;
}

export interface InsertRejectionResult {
    inserted: boolean;
    id: number | null;
}