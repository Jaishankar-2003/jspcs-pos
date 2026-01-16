#!/bin/bash
cd frontend
echo "Installing dependencies..."
npm install axios react-router-dom zustand @tanstack/react-query lucide-react clsx tailwind-merge date-fns react-hook-form zod @hookform/resolvers framer-motion recharts react-hot-toast
echo "Installing dev dependencies..."
npm install -D tailwindcss postcss autoprefixer @types/node
echo "Initializing Tailwind..."
npx tailwindcss init -p

echo "Creating folder structure..."
mkdir -p src/api
mkdir -p src/assets/images
mkdir -p src/assets/fonts
mkdir -p src/components/ui
mkdir -p src/features/auth/components
mkdir -p src/features/auth/hooks
mkdir -p src/features/auth/pages
mkdir -p src/features/admin/components
mkdir -p src/features/admin/hooks
mkdir -p src/features/admin/pages
mkdir -p src/features/cashier/components
mkdir -p src/features/cashier/hooks
mkdir -p src/features/cashier/pages
mkdir -p src/features/shared/components
mkdir -p src/features/shared/hooks
mkdir -p src/hooks
mkdir -p src/layouts
mkdir -p src/router
mkdir -p src/store
mkdir -p src/types
mkdir -p src/utils

echo "Setup complete!"
