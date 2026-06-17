tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "tertiary": "#d1dfff",
                "surface": "#0a0f1e",
                "on-surface": "#dee1f7",
                "secondary-container": "#005c9b",
                "error": "#ffb4ab",
                "surface-container-lowest": "#090e1c",
                "on-secondary-container": "#b2d4ff",
                "on-primary": "#003642",
                "surface-container-low": "#161b2b",
                "on-primary-container": "#00586b",
                "secondary": "#9ecaff",
                "primary-fixed-dim": "#3cd7ff",
                "surface-dim": "#0e1322",
                "on-tertiary": "#0d2f60",
                "surface-tint": "#3cd7ff",
                "primary-container": "#00d4ff",
                "on-surface-variant": "#bbc9cf",
                "outline": "#859398",
                "primary": "#a8e8ff",
                "surface-container-high": "#25293a",
                "outline-variant": "#3c494e",
                "on-background": "#dee1f7",
                "background": "#0a0f1e",
            },
            "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
            },
            "spacing": {
                "unit": "4px",
                "grid-columns": "12",
                "margin-mobile": "16px",
                "gutter": "24px",
                "margin-desktop": "64px"
            },
            "fontFamily": {
                "headline-lg-mobile": ["Hanken Grotesk"],
                "label-sm": ["JetBrains Mono"],
                "headline-lg": ["Hanken Grotesk"],
                "body-md": ["Inter"],
                "display-lg": ["Hanken Grotesk"]
            },
            "fontSize": {
                "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
                "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500" }],
                "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
                "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }]
            }
        },
    },
}
