import globalStyles from './globals.module.scss'

export const metadata = {
    title: 'Classicy',
    description: 'MacOS 8.5 "Platinum"',
}

const favicons: [number, number, string][] = [
    [57, 57, 'apple-touch-icon'],
    [60, 60, 'apple-touch-icon'],
    [72, 72, 'apple-touch-icon'],
    [76, 76, 'apple-touch-icon'],
    [114, 114, 'apple-touch-icon'],
    [120, 120, 'apple-touch-icon'],
    [144, 144, 'apple-touch-icon'],
    [152, 152, 'apple-touch-icon'],
    [180, 180, 'apple-touch-icon'],
    [192, 192, 'apple-touch-icon'],
    [16, 16, 'icon'],
    [32, 32, 'icon'],
    [96, 96, 'icon'],
]

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <title>MacOS 8.6</title>
                <meta name="theme-color" content="#808080" />
                <meta
                    name="msapplication-TileImage"
                    content={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/ms-icon-144x144.png`}
                />
                <meta name="msapplication-TileColor" content="#808080" />
                <link rel="manifest" href="/manifest.json" />

                {favicons.map(([x, y, label]) => (
                    <link
                        key={[label, x, y].join('_')}
                        rel={label}
                        sizes={[x, y].join('x')}
                        href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/${label}-${[x, y].join('x')}.png`}
                    />
                ))}
            </head>
            <body className={globalStyles.classicy}>{children}</body>
        </html>
    )
}
