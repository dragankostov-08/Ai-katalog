import { useNavigation } from 'react-router'

export function NavigationProgress() {
  const navigation = useNavigation()
  const active = navigation.state !== 'idle'
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-tomato transition-[transform,opacity] duration-500 ease-out ${
        active ? 'scale-x-75 opacity-100' : 'scale-x-100 opacity-0'
      }`}
    />
  )
}
