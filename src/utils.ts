export const delay = async (timeInSec: number = Math.floor(Math.random() * 6) + 5): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, timeInSec * 1000));
};

export interface APIResponse {
  error: null | {
    name: string;
    message: string;
  };
  info: null | {
    url: string;
  };
  result: 'success' | 'error';
  status: number;
}

export interface MSEConfig {
  store?: {
    page?: {
      data?: {
        score?: {
          id: number;
          title: string;
          pages_count: number;
          tags: string[];
        };
      };
    };
    jmuse_settings?: {
      score_player?: {
        json?: {
          metadata?: {
            dimensions: string;
          };
        };
      };
    };
  };
}
