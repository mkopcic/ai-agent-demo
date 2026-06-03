import { Link, usePage } from '@inertiajs/react';
import { BookOpen, List, Menu, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import research from '@/routes/research';
import type { BreadcrumbItem, NavItem, SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const activeItemStyles = 'bg-accent text-accent-foreground';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const { t } = useTranslation();
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
    const mainNavItems: NavItem[] = [
        {
            title: t('common.library'),
            href: research.index(),
            icon: BookOpen,
        },
        {
            title: t('common.chat'),
            href: research.chat(),
            icon: MessageSquare,
        },
        {
            title: 'Logovi',
            href: '/logs',
            icon: List,
        },
    ];

    return (
        <>
            <div className="border-b border-border">
                <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-6">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 size-9"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-64 bg-background"
                            >
                                <SheetTitle className="sr-only">
                                    {t('nav.navigationMenu')}
                                </SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <div className="flex items-center gap-2">
                                        <AppLogoIcon size={24} />
                                        <span className="font-semibold">
                                            {t('common.appName')}
                                        </span>
                                    </div>
                                </SheetHeader>
                                <div className="mt-6 flex flex-col gap-2">
                                    {mainNavItems.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                                                isCurrentUrl(item.href) &&
                                                    activeItemStyles,
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="size-4" />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={research.index()}
                        prefetch
                        className="flex items-center gap-2"
                    >
                        <AppLogoIcon size={28} />
                        <span className="font-semibold">
                            {t('common.appName')}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-8 hidden h-full items-center lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch gap-1">
                                {mainNavItems.map((item) => (
                                    <NavigationMenuItem
                                        key={item.title}
                                        className="relative flex h-full items-center"
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                whenCurrentUrl(
                                                    item.href,
                                                    activeItemStyles,
                                                ),
                                                'h-8 cursor-pointer gap-2 px-3',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="size-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-9 rounded-full p-0"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user.avatar}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="border-b border-border">
                    <div className="mx-auto flex h-10 w-full max-w-7xl items-center px-6">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
