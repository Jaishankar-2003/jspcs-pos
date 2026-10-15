
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:flex flex-col justify-center items-center bg-primary/10 p-12 relative overflow-hidden">
                {/* Background blobs for visual interest */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -z-10"></div>

                <div className="max-w-md space-y-4 text-center z-10">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">JSPCS POS</h1>
                    <p className="text-muted-foreground text-lg">
                        Advanced Point of Sale System for modern businesses.
                        Manage sales, inventory, and customers with ease.
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-sm absolute top-4 right-4 lg:hidden">
                    {/* Mobile simplified header if needed, but layout centers content */}
                </div>
                <Outlet />
            </div>
        </div>
    );
};
