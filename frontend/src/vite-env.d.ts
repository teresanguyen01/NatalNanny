/// <reference types="vite/client" />

// Declare module types for image imports (both lowercase and uppercase extensions)
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.PNG' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.JPG' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.JPEG' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.SVG' {
  const src: string
  export default src
}
