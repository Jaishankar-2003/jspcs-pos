import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

export const CashierLayout = () => {
    // Automatically logout after 2 minutes of inactivity
    useInactivityLogout(120000);

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background h-[calc(100vh-60px)] overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};
