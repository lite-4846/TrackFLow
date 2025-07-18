import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  minify: process.env.NODE_ENV === 'production',
  target: 'node16',
  tsconfig: './tsconfig.json',
  external: ['@prisma/client', 'class-validator', 'class-transformer'],
});
