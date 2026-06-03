import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Folder,
    LayoutGrid,
    MessageSquare,
    Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import research from '@/routes/research';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { t } = useTranslation();
    const mainNavItems: NavItem[] = [
        {
            title: t('common.dashboard'),
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: t('common.research'),
            href: research.index(),
            icon: Search,
        },
        {
            title: t('common.chat'),
            href: research.chat(),
            icon: MessageSquare,
        },
    ];

    const footerNavItems: NavItem[] = [
        {
            title: t('common.repository'),
            href: 'https://github.com/mkopcic/ai-agent-demo',
            icon: Folder,
        },
        {
            title: t('common.documentation'),
            href: 'https://laravel.com/docs/starter-kits#react',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
