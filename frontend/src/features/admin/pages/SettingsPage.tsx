import {
    Settings,
    Bell,
    Lock,
    User,
    Database,
    Palette,
    HelpCircle,
    Save,
    Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const SettingsPage = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your application preferences and system configuration.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <div className="md:col-span-1">
                    <nav className="flex flex-col space-y-1">
                        {[
                            { name: "General", icon: Settings, active: true },
                            { name: "Store Info", icon: Store, active: false },
                            { name: "Account", icon: User, active: false },
                            { name: "Security", icon: Lock, active: false },
                            { name: "Notifications", icon: Bell, active: false },
                            { name: "Appearance", icon: Palette, active: false },
                            { name: "Database", icon: Database, active: false },
                        ].map((item, i) => (
                            <Button
                                key={i}
                                variant={item.active ? "secondary" : "ghost"}
                                className="justify-start"
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.name}
                            </Button>
                        ))}
                    </nav>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>Configure basic application settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Business Name</label>
                                    <Input defaultValue="JSPCS POS" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Currency Symbol</label>
                                    <Input defaultValue="₹ (INR)" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Default Tax Rate (%)</label>
                                <Input type="number" defaultValue="18" />
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <Button>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Regional Settings</CardTitle>
                            <CardDescription>Update your language and timezone.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Language</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <option>English (India)</option>
                                        <option>Hindi</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Timezone</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <option>(GMT+05:30) India Standard Time</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="h-5 w-5 text-muted-foreground" />
                            <div className="text-sm">
                                <p className="font-medium">Need help with configuration?</p>
                                <p className="text-muted-foreground">Check our documentation or contact support.</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">Documentation</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
