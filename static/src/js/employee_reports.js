odoo.define('buma_hr_reports.employee_report', function(require){
    'use strict';
    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var rpc = require('web.rpc');
    var session = require('web.session');
    var utils = require('web.utils');
    var QWeb = core.qweb;
    var _t = core._t;
    var reportdata = [];
    var sessionStorage = window.sessionStorage;

    window.click_num = 0;
    var employeeReports = AbstractAction.extend({
        template: 'HR_report_employee',
        events:{
            'click #apply_filter': 'apply_filter',
            'click #xlsx': 'print_xlsx',
            'click .filter_category': '_onFilterCategory',
            'click .filter_date': '_onFilterDate',
            'click .o_add_custom_filter': '_onCustomFilter',
            'click .o_add_custom_filter_prev': '_onPrevFilter',
            'click .o_add_custom_filter_last': '_onLastFilter',
            'click #o_equip_filter_dropdown': '_onClickFilter',
            'click .clear-filter': 'clear_filter',
            'click .cf-line': 'show_drop_down',
            'click #collapse-button': 'collapse_all',
            'click': '_onAnyWhereClick',
            'click .btn-sort-line': 'onClickSortLine',
        },

        init: function(parent, action) {
            this._super(parent, action);
            this.currency=action.currency;
            this.report_lines = action.report_lines;
            this.categories = 'all';
            this.wizard_id = action.context.wizard | null;
        },

        start: function() {
            var self = this;

            self.initial_render = true;
            var filter_data_selected = {};

            var dt = new Date();
            dt.setDate(1);
            filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
            dt.setMonth(dt.getMonth() + 1);
            dt.setDate(0);
            filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');

            rpc.query({
                model: 'hr.employee.report',
                method: 'create',
                args: [ filter_data_selected ]
            }).then(function(t_res) {
                console.log(t_res)
                self.wizard_id = t_res;
                self.load_data(self.initial_render);
            });
            
        },

        load_data: function(initial_render = true) {
            var self = this;
            debugger
            self.$(".categ").empty();
            $('div.o_action_manager').css('overflow-y', 'auto');
            self.$('.filter_view_tb').html(QWeb.render('HR_filter'));
            self.$('.table_view_tb').html(QWeb.render('HR_detail'));
            

            // try{
            //     var self = this;
            //     self._rpc({
            //         model: 'hr.employee.report',
            //         method: 'view_report',
            //         args: [[this.wizard_id]],
            //     }).then(function(datas) {
            //         let datas = sessionStorage.setItem('reportdata', JSON.stringify(datas));
            //         let dict = {
            //         }
            //         console.log(datas)

            //         if (initial_render) {
            //             
            //         }

            //         
            //         reportdata = datas
            //     });
            // } catch (el) {
            //     window.location.href
            // }
        },

        _onFilterDate: function(ev) {
            ev.preventDefault();
            $(ev.target).parents().find('ul.o_date_filter').find('li > a.selected').removeClass('selected');
            if (!$('.o_account_reports_custom-dates').hasClass('d-none')) {
                $('.o_account_reports_custom-dates').addClass('d-none');
            }
            if ($(ev.target).is('a')) {
                $(ev.target).addClass('selected');
            }
            else {
                $(ev.target).find('a').addClass('selected');
            }
            var title = $(ev.target).parents().find('ul.o_date_filter').find('li > a.selected').parent().attr('title');
            $('.date_caret').text(title);
            var custom_dates = $(ev.target).parents().find('ul.o_filters_menu').find('.o_account_reports_custom-dates');
            custom_dates.addClass('d-none');
            var custom_comp_dates = $(ev.target).parents().find('ul.o_filters_comp_menu').find('.o_account_reports_custom-dates');
            custom_comp_dates.addClass('d-none');
            $('.date_caret_comp').text(title);
        },

        clear_filter: function (event){
            event.preventDefault();
            var self = this;
            $(".active-filter, .active-filter a, .clear-filter").css('display', 'none');

            var filter_data_selected = {};

            //Date & Comparison
            $('.filter_date[data-value="this_month"]').click();

            //Target Move
            var post_res = document.querySelectorAll("[id='post_res']")
            for (var i = 0; i < post_res.length; i++) {
                post_res[i].value = "Posted"
                post_res[i].innerHTML = "Posted"
            }
            filter_data_selected.target_move = "Posted"

            //Others
            filter_data_selected.comp_detail = "month"
            filter_data_selected.comparison = 0;

            //Clear All Selections
            var search_choice = document.querySelectorAll(".select2-search-choice")
            for (var i = 0; i < search_choice.length; i++) {
                search_choice[i].remove()
            }
            var chosen = document.querySelectorAll(".select2-chosen")
            for (var i = 0; i < chosen.length; i++) {
                chosen[i].value = ""
                chosen[i].innerHTML = ""
            }


            var dt;
            dt = new Date();
            dt.setDate(1);
            filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');

            dt.setMonth(dt.getMonth() + 1);
            dt.setDate(0);
            filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');

            filter_data_selected.previous = false;
            rpc.query({
                model: 'hr.employee.report',
                method: 'write',
                args: [
                    self.wizard_id, filter_data_selected
                ],
            }).then(function(res) {
            self.initial_render = false;
                self.load_data(self.initial_render);
            });
        },

        apply_filter: function(event) {
            $(".active-filter, .clear-filter").css('display', 'block');
            $(".filter_content").css('display', 'none');

            event.preventDefault();
            var self = this;
            self.initial_render = false;
            var filter_data_selected = {};
            filter_data_selected.previous = false;
            filter_data_selected.comparison = 0;

            if ($(".levels").length){
                var level_res = document.getElementById("level_res")
                filter_data_selected.levels = $(".levels")[1].value
                level_res.value = $(".levels")[1].value
                level_res.innerHTML=level_res.value;
                if ($(".levels").value==""){
                type_res.innerHTML="summary";
                filter_data_selected.type = "Summary"
                }
            }

            var dt;
            var list_item_selected = $('ul.o_date_filter').find('li > a.selected');
            filter_data_selected.date_from = "";
            filter_data_selected.date_to = "";
            
            if (list_item_selected.length) {
                var filter_value = $('ul.o_date_filter').find('li > a.selected').parent().data('value');
                $(".date-filter").css('display', 'initial');

                if (filter_value == "this_month") {
                    dt = new Date();
                    dt.setDate(1);
                    filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
                    dt.setMonth(dt.getMonth() + 1);
                    dt.setDate(0);
                    filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "month";
                }
                else if (filter_value == "this_quarter") {
                    dt = new moment();
                    filter_data_selected.date_from = dt.startOf('quarter').format('YYYY-MM-DD');
                    filter_data_selected.date_to = dt.endOf('quarter').format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "quarter";
                }
                else if (filter_value == "this_financial_year") {
                    dt = new Date();
                    var year = dt.getFullYear();
                    filter_data_selected.date_from = moment([year]).startOf('year').format('YYYY-MM-DD');
                    filter_data_selected.date_to = moment([year]).endOf('year').format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "year";

                }
                else if (filter_value == "last_month") {
                    dt = new Date();
                    dt.setDate(1);
                    filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
                    dt.setMonth(dt.getMonth() + 1);
                    dt.setDate(0);
                    filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "lastmonth";
                }
                else if (filter_value == "last_quarter") {
                    dt = new moment();
                    filter_data_selected.date_from = dt.startOf('quarter').format('YYYY-MM-DD');
                    filter_data_selected.date_to = dt.endOf('quarter').format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "lastquarter";
                }
                else if (filter_value == "last_year") {
                    dt = new Date();
                    var year = dt.getFullYear();
                    filter_data_selected.date_from = moment([year]).startOf('year').format('YYYY-MM-DD');
                    filter_data_selected.date_to = moment([year]).endOf('year').format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "lastyear";
                }
                else if (filter_value == "today") {
                    dt = new Date();
                    dt.setDate(1);
                    filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
                    dt.setDate(0);
                    filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "today";
                }
                else if (filter_value == "no") {
                    dt = new Date();
                    filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
                    filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');
                    filter_data_selected.comp_detail = "month";
                }
            }
            else if (list_item_selected.length == 0) {
                dt = new Date();
                filter_data_selected.date_from = moment(dt).format('YYYY-MM-DD');
                filter_data_selected.date_to = moment(dt).format('YYYY-MM-DD');
                if ($("#date_from").val()) {
                    var dateString = $("#date_from").val();
                    filter_data_selected.date_from = dateString;
                }
                if ($("#date_to").val()) {
                    var dateString = $("#date_to").val();
                    filter_data_selected.date_to = dateString;
                }
                filter_data_selected.comp_detail = "custom";                
            }        


            if ($("#prev").val()) {
                var prev = $("#prev").val();
                filter_data_selected.comparison = prev;
                filter_data_selected.previous = true;
                document.getElementById("last").value = null;
                document.getElementById("prev").value = null;
            }

            if ($("#last").val()) {
                var last = $("#last").val();
                filter_data_selected.comparison = last;
                filter_data_selected.previous = false;
                document.getElementById("prev").value = null;
                document.getElementById("last").value = null;
            }

            if (filter_data_selected.comparison != 0) {
                $(".comparison-filter").css('display', 'initial');
            } 

            rpc.query({
                model: 'hr.employee.report',
                method: 'write',
                args: [
                    self.wizard_id, filter_data_selected
                ],
            }).then(function(res) {
                self.initial_render = false;
                self.load_data(self.initial_render);
            });
        },

        // ===============================================================================


        onClickSortLine: function(ev) {
            ev.preventDefault();
            var self = this;
            var sort = ev.currentTarget.dataset.sort;
            var sort_type = false;
        },


        _onAnyWhereClick: function(ev){
             
        },

        collapse_all: function(event) {

        },

        show_drop_down: function(event) {
            event.preventDefault();
        },

        _onClickFilter: function(ev) {
            ev.preventDefault();
        },

        _onFilterCategory: function(ev) {
            ev.preventDefault();
        },


        _onCustomFilter: function(ev) {
            ev.preventDefault();
        },

        _onPrevFilter: function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        },

        _onLastFilter: function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        },

        print_xlsx: function() {
            var self = this;
            var action_title = self._title;
            var obj = JSON.parse(sessionStorage.getItem('reportdata'));
            
            var action = {
                'type': 'ir_actions_dynamic_xlsx_download',
                'data': {
                     'model': 'hr.employee.report',
                     'options': JSON.stringify(obj['filters']),
                     'output_format': 'xlsx',
                     'report_data': JSON.stringify(obj),
                     'report_name': 'Employee Reports',
                     'dfr_data': [],
                },
            };
            return self.do_action(action);
        },

        

    });
    core.action_registry.add("hr_em_r", employeeReports);
    return employeeReports;
});