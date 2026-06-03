import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

interface PageProps {
    [key: string]: unknown;
    hasOpenAiKey: boolean;
    status?: string;
}

export default function ApiKeys() {
    const { t } = useTranslation();
    const { hasOpenAiKey, status } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.apiKeysTitle'),
            href: '/settings/api-keys',
        },
    ];

    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm({
            openai_api_key: '',
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/settings/api-keys', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.apiKeysTitle')} />

            <h1 className="sr-only">{t('settings.apiKeysTitle')}</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title={t('settings.apiKeysDescription')}
                        description={t('settings.openAiKeyDescription')}
                    />

                    <div className="flex items-center gap-2 text-sm">
                        {hasOpenAiKey ? (
                            <>
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    {t('settings.openAiKeySet')}
                                </span>
                            </>
                        ) : (
                            <>
                                <XCircle className="size-4 text-destructive" />
                                <span className="text-destructive">
                                    {t('settings.openAiKeyNotSet')}
                                </span>
                            </>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="openai_api_key">
                                {t('settings.openAiKey')}
                            </Label>

                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="openai_api_key"
                                    type="password"
                                    className="pl-9"
                                    value={data.openai_api_key}
                                    onChange={(e) =>
                                        setData('openai_api_key', e.target.value)
                                    }
                                    placeholder={t('settings.openAiKeyPlaceholder')}
                                    autoComplete="off"
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                {t('settings.openAiKeyHint')}
                            </p>

                            <InputError message={errors.openai_api_key} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit"
                                disabled={processing}
                                data-test="save-api-key-button"
                            >
                                {t('settings.saveApiKey')}
                            </Button>

                            <Transition
                                show={
                                    recentlySuccessful ||
                                    status === 'api-key-updated'
                                }
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">
                                    {t('common.saved')}
                                </p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
