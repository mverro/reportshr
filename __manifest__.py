# -*- coding: utf-8 -*-
{
    'name': "Buma HR Reports",

    'summary': """
        Buma HR Reports""",

    'description': """
        Buma HR Reports
    """,

    'author': "Azzam Adnan/hashmicro",
    'website': "http://www.hashmicro.com",
    'category': 'Human Resources',
    'version': '0.1',
    'depends': ['base','hr_recruitment'],
    'data': [
        'security/ir.model.access.csv',
        
        'views/assets.xml',
        'views/menu_reports.xml',
    ],
    'qweb': [
        'static/src/xml/*.xml',
    ],
}