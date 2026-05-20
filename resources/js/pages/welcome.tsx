import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title={t('common.appName')} />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
                <div className="flex flex-col items-center gap-8">
                    <AppLogoIcon size={80} />

                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {t('common.appName')}
                    </h1>

                    <div className="flex gap-3">
                        {auth.user ? (
                            <Button asChild>
                                <Link href={dashboard()}>
                                    {t('common.dashboard')}
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={login()}>
                                        {t('auth.loginAction')}
                                    </Link>
                                </Button>
                                {canRegister && (
                                    <Button asChild>
                                        <Link href={register()}>
                                            {t('auth.signUp')}
                                        </Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
