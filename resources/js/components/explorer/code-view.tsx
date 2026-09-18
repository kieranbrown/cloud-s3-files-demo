import { useEffect, useState } from 'react';

interface CodeViewProps {
    code: string;
    language: string;
}

/**
 * Files above this size are shown as plain text; highlighting them would
 * lock up the tab.
 */
const HIGHLIGHT_LIMIT = 300_000;

export function CodeView({ code, language }: CodeViewProps) {
    const [html, setHtml] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        setHtml(null);

        if (code.length > HIGHLIGHT_LIMIT) {
            return;
        }

        import('shiki')
            .then(({ codeToHtml }) =>
                codeToHtml(code, {
                    lang: language,
                    themes: {
                        light: 'github-light',
                        dark: 'github-dark-default',
                    },
                    defaultColor: 'light-dark()',
                }),
            )
            .then((result) => {
                if (!cancelled) {
                    setHtml(result);
                }
            })
            .catch(() => {
                // Unknown grammar or failed load; the plain view stays.
            });

        return () => {
            cancelled = true;
        };
    }, [code, language]);

    if (html !== null) {
        return (
            <div
                className="min-w-max"
                // Shiki returns escaped, highlighted markup for the file.
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }

    return (
        <pre className="code-plain min-w-max py-4 pr-5 font-mono text-[0.8125rem] leading-[1.65] text-neutral-800 dark:text-neutral-200">
            {code.split('\n').map((line, index) => (
                <span key={index} className="line">
                    {line}
                </span>
            ))}
        </pre>
    );
}
