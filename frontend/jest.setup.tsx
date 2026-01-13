import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock wagmi hooks
jest.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
  }),
  useConnect: () => ({
    connect: jest.fn(),
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: jest.fn(),
  }),
  useBalance: () => ({
    data: { value: BigInt("1000000000000000000"), formatted: "1.0" },
  }),
  useReadContract: () => ({
    data: undefined,
    isLoading: false,
  }),
  useWriteContract: () => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
    error: null,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
}));

// Mock Google Maps
const mockGoogleMaps = {
  maps: {
    Map: jest.fn().mockImplementation(() => ({
      setCenter: jest.fn(),
      addListener: jest.fn(),
      panTo: jest.fn(),
    })),
    marker: {
      AdvancedMarkerElement: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(),
        map: null,
      })),
    },
    ControlPosition: {
      RIGHT_BOTTOM: 0,
    },
  },
};

(global as any).google = mockGoogleMaps;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
(global as any).ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
(global as any).IntersectionObserver = IntersectionObserverMock;

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Warning: An update to") ||
        args[0].includes("act(...)"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
