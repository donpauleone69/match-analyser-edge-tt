declare const useMatchStore: { setState: (value: unknown) => void }

export function write() {
  useMatchStore.setState({ open: true })
}
