import type { ImgHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

interface AppLogoIconProps extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'alt'
> {
    size?: number;
}

export default function AppLogoIcon({
    size = 36,
    className,
    ...props
}: AppLogoIconProps) {
    const { t } = useTranslation();

    return (
        <img
            src="/images/hrcak.png"
            alt={t('common.appName')}
            width={size}
            height={size}
            className={className}
            {...props}
        />
    );
}
