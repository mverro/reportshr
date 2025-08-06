# -*- coding: utf-8 -*-
{
    'name': " HR Reports",

    'summary': """
         HR Reports""",

    'description': """
         HR Reports
    """,

    'author': "Azzam Adnan/hashmicro",
    'website': "",
    'category': 'Human Resources',
    'version': '0.1',
    'depends': [
        'base',
        'hr',
        'hr_recruitment',
        'web',
        'report_xlsx',
        ],
    'data': [
        'security/ir.model.access.csv',
        
        'views/assets.xml',
        'views/menu_reports.xml',
    ],
    'qweb': [
        'static/src/xml/*.xml',
    ],
}