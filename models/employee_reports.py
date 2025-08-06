from odoo import models, fields, api
from odoo.exceptions import UserError
import base64
import io
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import time, io, json, calendar

try:
    from odoo.tools.misc import xlsxwriter
except ImportError:
    import xlsxwriter

class EmployeeReports(models.TransientModel):
    _name = 'hr.employee.report'
    _description = 'HR Applicant Reports'

    @api.model
    def get_applicant_data(self, filters=None, offset=0, limit=20, export_all=False):
        if not filters:
            filters = {}

        allowed_branch_ids = self.env.context.get('allowed_branch_ids', [])
        where_conditions = []
        params = []

        if allowed_branch_ids:
            where_conditions.append("ha.branch_id IN %s")
            params.append(tuple(allowed_branch_ids))

        if filters.get('position_ids'):
            where_conditions.append("ha.job_id IN %s")
            params.append(tuple(filters['position_ids']))

        if filters.get('department_ids'):
            where_conditions.append("ha.department_id IN %s")
            params.append(tuple(filters['department_ids']))

        if filters.get('project_ids'):
            where_conditions.append("ha.work_location_id IN %s")
            params.append(tuple(filters['project_ids']))

        if filters.get('point_of_hire_ids'):
            where_conditions.append("ha.point_of_hire_id IN %s")
            params.append(tuple(filters['point_of_hire_ids']))

        if filters.get('candidate_name'):
            where_conditions.append("ha.partner_name ILIKE %s")
            params.append('%' + filters['candidate_name'] + '%')

        query = """
            SELECT 
                ha.id,
                hj.name as position,
                hd.name as department,
                wlo.name as project,
                hpoh.name as point_of_hire,
                ha.partner_name as candidate_name
            FROM hr_applicant ha
            LEFT JOIN hr_job hj ON ha.job_id = hj.id
            LEFT JOIN hr_department hd ON ha.department_id = hd.id
            LEFT JOIN work_location_object wlo ON ha.work_location_id = wlo.id
            LEFT JOIN hr_point_of_hire hpoh ON ha.point_of_hire_id = hpoh.id
        """

        if where_conditions:
            query += " WHERE " + " AND ".join(where_conditions)

        query += " ORDER BY ha.id"
        
        if not export_all:
            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])

        self.env.cr.execute(query, params)
        applicants = self.env.cr.dictfetchall()

        result = []
        for applicant in applicants:
            result.append({
                'position': applicant.get('position') or '',
                'department': applicant.get('department') or '',
                'project': applicant.get('project') or '',
                'point_of_hire': applicant.get('point_of_hire') or '',
                'candidate_name': applicant.get('candidate_name') or '',
                'psikotest': '',
                'interview': '',
                'offering_letter': '',
                'mcu_location': '',
                'initial_mcu_date': '',
                'last_mcu_date': '',
                'mcu_result': '',
                'pkwt': '',
                'training_pre_mobilization': '',
                'induction': '',
                'notes': '',
                'target_date': '',
                'actual_date': '',
            })

        return result

    @api.model
    def get_applicant_count(self, filters=None):
        """Get total count of records for pagination"""
        if not filters:
            filters = {}

        allowed_branch_ids = self.env.context.get('allowed_branch_ids', [])
        where_conditions = []
        params = []

        if allowed_branch_ids:
            where_conditions.append("ha.branch_id IN %s")
            params.append(tuple(allowed_branch_ids))

        if filters.get('position_ids'):
            where_conditions.append("ha.job_id IN %s")
            params.append(tuple(filters['position_ids']))

        if filters.get('department_ids'):
            where_conditions.append("ha.department_id IN %s")
            params.append(tuple(filters['department_ids']))

        if filters.get('project_ids'):
            where_conditions.append("ha.work_location_id IN %s")
            params.append(tuple(filters['project_ids']))

        if filters.get('point_of_hire_ids'):
            where_conditions.append("ha.point_of_hire_id IN %s")
            params.append(tuple(filters['point_of_hire_ids']))

        if filters.get('candidate_name'):
            where_conditions.append("ha.partner_name ILIKE %s")
            params.append('%' + filters['candidate_name'] + '%')

        query = """
            SELECT COUNT(*)
            FROM hr_applicant ha
            LEFT JOIN hr_job hj ON ha.job_id = hj.id
            LEFT JOIN hr_department hd ON ha.department_id = hd.id
            LEFT JOIN work_location_object wlo ON ha.work_location_id = wlo.id
            LEFT JOIN hr_point_of_hire hpoh ON ha.point_of_hire_id = hpoh.id
        """

        if where_conditions:
            query += " WHERE " + " AND ".join(where_conditions)

        self.env.cr.execute(query, params)
        return self.env.cr.fetchone()[0]

    @api.model
    def get_filter_values(self):
        """Get values for filter dropdowns"""
        return {
            'positions': self.env['hr.job'].search_read([], ['id', 'name']),
            'departments': self.env['hr.department'].search_read([], ['id', 'name']),
            'projects': self.env['work.location.object'].search_read([], ['id', 'name']),
            'point_of_hires': self.env['hr.point.of.hire'].search_read([], ['id', 'name']),
        }
        
    @api.model
    def get_xlsx_report(self, filters=None):
        """Generate XLSX report and return download URL - exports all data"""
        try:
            temp_record = self.create({})
            applicant_data = self.get_applicant_data(filters, export_all=True)
            context = dict(self.env.context)
            context.update({
                'report_filters': filters or {},
                'report_data': applicant_data
            })
            
            report = self.env['ir.actions.report'].search([
                ('report_name', '=', 'reportshr.employee_report_xlsx')
            ], limit=1)

            if not report:
                raise UserError("Report not found")

            xlsx_content, content_type = report.with_context(context)._render_xlsx(
                'reportshr.employee_report_xlsx', 
                temp_record.ids
            )

            temp_record.unlink()
            attachment = self.env['ir.attachment'].create({
                'name': 'Employee_Reports.xlsx',
                'type': 'binary',
                'datas': base64.b64encode(xlsx_content),
                'store_fname': 'Employee Reports.xlsx',
                'mimetype': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })

            return attachment.id

        except Exception as e:
            raise UserError("Error generating XLSX report: %s" % str(e))


class ApplicantReportXlsx(models.AbstractModel):
    _name = 'report.reportshr.employee_report_xlsx'
    _inherit = 'report.report_xlsx.abstract'

    def generate_xlsx_report(self, workbook, data, records):
        sheet = workbook.add_worksheet('Applicant Report')
        
        header_format = workbook.add_format({
            'bold': True,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': '#D3D3D3',
            'border': 1,
            'text_wrap': True,
        })
        
        cell_format = workbook.add_format({
            'align': 'left',
            'valign': 'top',
            'border': 1,
            'text_wrap': True,
        })

        headers = [
            'Position', 'Department', 'Project', 'Point of Hire', 'Candidate Name',
            'Psikotest', 'Interview', 'Offering Letter', 'MCU Location',
            'Initial MCU Date', 'Last MCU Date', 'MCU Result', 'PKWT / Kontrak Kerja',
            'Training Pre Mobilization', 'Induction', 'Notes', 'Target Date', 'Actual Date'
        ]
        
        for col, header in enumerate(headers):
            sheet.write(0, col, header, header_format)
            if col < 5:
                sheet.set_column(col, col, 20)
            else:
                sheet.set_column(col, col, 15)

        if self.env.context.get('report_data'):
            applicant_data = self.env.context['report_data']
        else:
            report_obj = self.env['hr.employee.report']
            filters = self.env.context.get('report_filters', {})
            applicant_data = report_obj.get_applicant_data(filters, export_all=True)

        for row, applicant in enumerate(applicant_data, 1):
            sheet.write(row, 0, applicant.get('position', ''), cell_format)
            sheet.write(row, 1, applicant.get('department', ''), cell_format)
            sheet.write(row, 2, applicant.get('project', ''), cell_format)
            sheet.write(row, 3, applicant.get('point_of_hire', ''), cell_format)
            sheet.write(row, 4, applicant.get('candidate_name', ''), cell_format)
            sheet.write(row, 5, applicant.get('psikotest', ''), cell_format)
            sheet.write(row, 6, applicant.get('interview', ''), cell_format)
            sheet.write(row, 7, applicant.get('offering_letter', ''), cell_format)
            sheet.write(row, 8, applicant.get('mcu_location', ''), cell_format)
            sheet.write(row, 9, applicant.get('initial_mcu_date', ''), cell_format)
            sheet.write(row, 10, applicant.get('last_mcu_date', ''), cell_format)
            sheet.write(row, 11, applicant.get('mcu_result', ''), cell_format)
            sheet.write(row, 12, applicant.get('pkwt', ''), cell_format)
            sheet.write(row, 13, applicant.get('training_pre_mobilization', ''), cell_format)
            sheet.write(row, 14, applicant.get('induction', ''), cell_format)
            sheet.write(row, 15, applicant.get('notes', ''), cell_format)
            sheet.write(row, 16, applicant.get('target_date', ''), cell_format)
            sheet.write(row, 17, applicant.get('actual_date', ''), cell_format)