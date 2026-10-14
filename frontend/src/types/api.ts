export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    source?: string;
    counts?: {
      platform: number;
      ticketing: number;
    };
  };
}
