import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  createConfig: vi.fn(() => ({})),
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useConnect: () => ({
    connect: vi.fn(),
    connectors: [],
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  useBalance: () => ({
    data: { value: BigInt('1000000000000000000'), formatted: '1.0' },
  }),
  useChainId: () => 5000,
  useSwitchChain: () => ({
    switchChain: vi.fn(),
  }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
  useReadContract: () => ({
    data: BigInt(10),
  }),
  http: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fetch globally
global.fetch = vi.fn()
