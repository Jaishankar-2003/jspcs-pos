
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authSlice';
import { authApi } from '@/api/auth';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            const response = await authApi.login(data);
            login(response);
            toast.success('Logged in successfully');

            // Redirect based on role
            if (response.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/cashier/billing');
            }
        } catch (error) {
            const message = error instanceof Error && 'response' in error
                ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Invalid credentials';
            toast.error(message || 'Invalid credentials');
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-muted-foreground">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input
                        {...register('username')}
                        placeholder="Enter username"
                        disabled={isSubmitting}
                        autoFocus // Logic: Focus first field on load
                    />
                    {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Password</label>
                        {/* <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a> */}
                    </div>
                    <Input
                        {...register('password')}
                        type="password"
                        placeholder="••••••"
                        disabled={isSubmitting}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
            </form>
        </div>
    );
};
