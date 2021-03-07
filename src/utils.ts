export const delay = async (timeInSec: number) => {
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
