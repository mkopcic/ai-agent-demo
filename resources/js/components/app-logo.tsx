import AppLogoIcon from './app-logo-icon';
import { useTranslation } from 'react-i18next';

export default function AppLogo() {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md">
                <AppLogoIcon size={32} />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {t('common.appName')}
                </span>
            </div>
        </>
    );
}
