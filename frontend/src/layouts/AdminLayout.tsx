import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

export const AdminLayout = () => {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr]">
            <Sidebar />
            <div className="flex flex-col">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background overflow-auto h-[calc(100vh-60px)]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
