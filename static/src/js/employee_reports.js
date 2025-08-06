odoo.define('buma_hr_reports.employee_reports', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var QWeb = core.qweb;
    var rpc = require('web.rpc');
    var framework = require('web.framework');

    var EmployeeReports = AbstractAction.extend({
        template: 'buma_hr_reports.EmployeeReports',
        events: {
            'click .o_apply_filter': '_onApplyFilter',
            'click .o_export_xlsx': '_onExportXlsx',
            'click .o_reset_filter': '_onResetFilter',
            'click .o_pagination_prev': '_onPrevPage',
            'click .o_pagination_next': '_onNextPage',
            'click .o_pagination_page': '_onGoToPage',
        },

        init: function(parent, action) {
            this._super.apply(this, arguments);
            this.actionManager = parent;
            this.filters = {};
            this.currentPage = 1;
            this.pageSize = 20;
            this.totalRecords = 0;
            this.totalPages = 0;
        },

        start: function() {
            return this._super().then(this._initializeWidgets.bind(this));
        },

        _initializeWidgets: async function() {
            this.filterValues = await this._getFilterValues();
            this._renderFilters();
            this._initializeSelect2();
            this._fetchData();
        },

        _getFilterValues: function() {
            return rpc.query({
                model: 'hr.employee.report',
                method: 'get_filter_values',
            });
        },

        _renderFilters: function() {
            this.$('.o_filter_section').html(QWeb.render('buma_hr_reports.Filters', {
                filterValues: this.filterValues,
            }));
            this._bindFilterEvents();
        },

        _bindFilterEvents: function() {
            var self = this;
            
            // Toggle filter panel
            this.$('.o_toggle_filter').off('click').on('click', function() {
                self._toggleFilterPanel();
            });
            
            // Close filter panel
            this.$('.o_close_filter').off('click').on('click', function() {
                self._closeFilterPanel();
            });
        },

        _initializeSelect2: function() {
            var self = this;
            
            var select2Config = {
                placeholder: "Select...",
                allowClear: true,
                width: '100%',
                templateResult: function(option) {
                    if (!option.id) {
                        return option.text;
                    }
                    return $('<span class="o_tag_color_0">' + option.text + '</span>');
                },
                templateSelection: function(option) {
                    if (!option.id) {
                        return option.text;
                    }
                    return $('<span class="o_tag o_tag_color_0"><span class="o_tag_text">' + option.text + '</span></span>');
                },
                escapeMarkup: function(markup) {
                    return markup;
                }
            };

            this.$('#position_select').select2($.extend({}, select2Config, {
                placeholder: "Select positions..."
            }));

            this.$('#department_select').select2($.extend({}, select2Config, {
                placeholder: "Select departments..."
            }));

            this.$('#project_select').select2($.extend({}, select2Config, {
                placeholder: "Select projects..."
            }));

            this.$('#poh_select').select2($.extend({}, select2Config, {
                placeholder: "Select point of hires..."
            }));
        },

        _fetchData: function() {
            framework.blockUI();
            var offset = (this.currentPage - 1) * this.pageSize;
            
            return Promise.all([
                rpc.query({
                    model: 'hr.employee.report',
                    method: 'get_applicant_data',
                    args: [this.filters, offset, this.pageSize],
                }),
                rpc.query({
                    model: 'hr.employee.report',
                    method: 'get_applicant_count',
                    args: [this.filters],
                })
            ]).then((results) => {
                var data = results[0];
                this.totalRecords = results[1];
                this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
                
                this._renderContent(data);
                this._renderPagination();
                framework.unblockUI();
            });
        },

        _renderContent: function(data) {
            this.$('.o_content_section').html(QWeb.render('buma_hr_reports.Content', {
                data: data,
                currentPage: this.currentPage,
                pageSize: this.pageSize,
                totalRecords: this.totalRecords,
                totalPages: this.totalPages,
                startRecord: ((this.currentPage - 1) * this.pageSize) + 1,
                endRecord: Math.min(this.currentPage * this.pageSize, this.totalRecords),
            }));
        },

        _renderPagination: function() {
            this.$('.o_pagination_section').html(QWeb.render('buma_hr_reports.Pagination', {
                currentPage: this.currentPage,
                totalPages: this.totalPages,
                totalRecords: this.totalRecords,
                startRecord: ((this.currentPage - 1) * this.pageSize) + 1,
                endRecord: Math.min(this.currentPage * this.pageSize, this.totalRecords),
                hasPrevious: this.currentPage > 1,
                hasNext: this.currentPage < this.totalPages,
                pages: this._getPageNumbers(),
            }));
        },

        _getPageNumbers: function() {
            var pages = [];
            var start = Math.max(1, this.currentPage - 2);
            var end = Math.min(this.totalPages, start + 4);
            
            if (end - start < 4) {
                start = Math.max(1, end - 4);
            }
            
            for (var i = start; i <= end; i++) {
                pages.push({
                    number: i,
                    current: i === this.currentPage
                });
            }
            return pages;
        },

        _toggleFilterPanel() {
                const filterPanel = document.getElementById('filterPanel');
                const toggleBtn = document.querySelector('.o_toggle_filter');
                
                if (filterPanel.style.display === 'none' || filterPanel.style.display === '') {
                    filterPanel.style.display = 'block';
                    toggleBtn.innerHTML = '<i class="fa fa-filter mr-1"></i>Hide Filter';
                    toggleBtn.classList.remove('btn-outline-primary');
                    toggleBtn.classList.add('btn-primary');
                    toggleBtn.style.borderColor = '#667eea';
                    toggleBtn.style.backgroundColor = '#667eea';
                    toggleBtn.style.color = 'white';
                } else {
                    filterPanel.style.display = 'none';
                    toggleBtn.innerHTML = '<i class="fa fa-filter mr-1"></i>Filter';
                    toggleBtn.classList.remove('btn-primary');
                    toggleBtn.classList.add('btn-outline-primary');
                    toggleBtn.style.borderColor = '#6c757d';
                    toggleBtn.style.backgroundColor = 'transparent';
                    toggleBtn.style.color = '#6c757d';
                }
            },
            
        _closeFilterPanel() {
            const filterPanel = document.getElementById('filterPanel');
            const toggleBtn = document.querySelector('.o_toggle_filter');
            
            filterPanel.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fa fa-filter mr-1"></i>Filter';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-outline-primary');
            toggleBtn.style.borderColor = '#6c757d';
            toggleBtn.style.backgroundColor = 'transparent';
            toggleBtn.style.color = '#6c757d';
        },

        _onApplyFilter: function(ev) {
            ev.preventDefault();
            
            this.filters = {
                position_ids: this.$('#position_select').val() || [],
                department_ids: this.$('#department_select').val() || [],
                project_ids: this.$('#project_select').val() || [],
                point_of_hire_ids: this.$('#poh_select').val() || [],
                candidate_name: this.$('.o_candidate_name_filter').val(),
            };

            this.filters.position_ids = this.filters.position_ids.map(id => parseInt(id));
            this.filters.department_ids = this.filters.department_ids.map(id => parseInt(id));
            this.filters.project_ids = this.filters.project_ids.map(id => parseInt(id));
            this.filters.point_of_hire_ids = this.filters.point_of_hire_ids.map(id => parseInt(id));
            
            this.currentPage = 1;
            this._fetchData();
        },

        _onResetFilter: function() {
            this.$('#position_select').val(null).trigger('change');
            this.$('#department_select').val(null).trigger('change');
            this.$('#project_select').val(null).trigger('change');
            this.$('#poh_select').val(null).trigger('change');
            this.$('.o_candidate_name_filter').val('');
            
            this.filters = {};
            this.currentPage = 1;
            this._fetchData();
        },

        _onPrevPage: function(ev) {
            ev.preventDefault();
            if (this.currentPage > 1) {
                this.currentPage--;
                this._fetchData();
            }
        },

        _onNextPage: function(ev) {
            ev.preventDefault();
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this._fetchData();
            }
        },

        _onGoToPage: function(ev) {
            ev.preventDefault();
            var page = parseInt($(ev.currentTarget).data('page'));
            if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this._fetchData();
            }
        },

        _onExportXlsx: function() {
            framework.blockUI();
            return rpc.query({
                model: 'hr.employee.report',
                method: 'get_xlsx_report',
                args: [this.filters],
            }).then(function(result) {
                framework.unblockUI();
                window.location = '/web/content/' + result;
            });
        },
    });

    core.action_registry.add('employee_reports', EmployeeReports);
    return EmployeeReports;
});