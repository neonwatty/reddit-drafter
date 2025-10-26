/// <reference types="vite/client" />

// Declare CSS module types for Vite ?inline import
declare module '*?inline' {
  const content: string
  export default content
}
