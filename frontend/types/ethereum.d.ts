// EIP-1193 + MetaMask global type. Minimal — just what GitDrip actually calls.
declare global {
  interface EthereumProvider {
    request(args: {
      method: string;
      params?: unknown[] | Record<string, unknown>;
    }): Promise<unknown>;
    on?(event: string, handler: (...args: unknown[]) => void): void;
    removeListener?(
      event: string,
      handler: (...args: unknown[]) => void,
    ): void;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
