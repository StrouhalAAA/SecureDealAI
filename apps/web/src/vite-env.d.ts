/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  interface SwaggerUIOptions {
    dom_id: string;
    url: string;
    docExpansion?: 'none' | 'list' | 'full';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    persistAuthorization?: boolean;
    onComplete?: () => void;
    requestInterceptor?: (request: { headers: Record<string, string> }) => { headers: Record<string, string> };
    syntaxHighlight?: {
      activate?: boolean;
      theme?: string;
    };
  }

  interface SwaggerUIInstance {
    preauthorizeApiKey: (name: string, value: string) => void;
  }

  function SwaggerUI(options: SwaggerUIOptions): SwaggerUIInstance;
  export default SwaggerUI;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
