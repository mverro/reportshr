from odoo import fields, models, api, _
from odoo.exceptions import AccessError, UserError, AccessDenied
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from odoo.tools.misc import formatLang, format_date
from odoo.tools import config, date_utils, get_lang
from babel.dates import get_quarter_names
import time, io, json, calendar, datetime
from itertools import groupby
from datetime import datetime

FETCH_RANGE = 2000
try:
    from odoo.tools.misc import xlsxwriter
except ImportError:
    import xlsxwriter


class HrEmployeeReport(models.TransientModel):
    _name = "hr.employee.report"

    date_from = fields.Date(string="Start Date", default=date.today().replace(day=1))
    date_to = fields.Date(string="End Date", default=fields.Date.today)
    # today = fields.Date("Report Date", default=fields.Date.today)

    company_ids = fields.Many2many("res.company",string="Companies")
    branch_ids = fields.Many2many("res.branch",string="Branch")

    @api.model
    def create(self, vals):
        res = super(HrEmployeeReport, self).create(vals)
        return res

    def write(self, vals):
        vals.update({'company_ids': [(4, j) for j in self.env.company.ids]})
        res = super(HrEmployeeReport, self).write(vals)
        return res

    @api.model
    def view_report(self, option):
        dynamic_result = {
            'name': "Employee Report",
            'type': 'ir.actions.client',
            'tag': 'hr_em_r',
        }
        r = self.env['hr.employee.report'].search([('id', '=', option[0])])
        data = {
            'model': self,
        }

        return dynamic_result


########################## REPORT EXCEL ############################################

    def get_dynamic_xlsx_report(self, data, response, report_data, dfr_data):

        data = json.loads(data)
        report_main_data = json.loads(report_data)
        today = date.today()
        formatted_date = today.strftime('%d/%m/%Y')

        list_previews = report_main_data.get('list_previews')
        report_lines = report_main_data.get('report_lines')
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})

        workbook.close()
        output.seek(0)
        response.stream.write(output.read())
        output.close()