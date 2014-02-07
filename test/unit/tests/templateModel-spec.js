describe("templateModel", function () {
    var model, element,
        html1 = '<div data-ux-datagrid="items" class="datagrid">' +
                '<script type="template/html" data-template-name="default" data-template-item="item">' +
                    '<div class="row {{fake}}" style="height:10px;">' +
                        '<div class="text">{{item.id}} {{$id}} {{counter}}</div>' +
                        '<div random-icons="pencil droid trash"></div>' +
                        '<input type="text">' +
                    '</div>' +
                '</script>' +
                '<script type="template/html" data-template-name="template1" data-template-item="item">' +
                    '<div class="row {{fake}}" style="height:20px;">' +
                        '<div class="text">{{item.id}} {{$id}} {{counter}}</div>' +
                        '<div random-icons="pencil droid trash"></div>' +
                        '<input type="text">' +
                    '</div>' +
                '</script>' +
            '</div>',
        html2 = '<div data-ux-datagrid="items" class="datagrid">' +
                '<script type="template/html" template-name="default" template-item="item">' +
                    '<div class="row {{fake}}" style="height:10px;">' +
                        '<div class="text">{{item.id}} {{$id}} {{counter}}</div>' +
                        '<div random-icons="pencil droid trash"></div>' +
                        '<input type="text">' +
                    '</div>' +
                '</script>' +
                '<script type="template/html" template-name="template1" template-item="item">' +
                    '<div class="row {{fake}}" style="height:10px;">' +
                        '<div class="text">{{item.id}} {{$id}} {{counter}}</div>' +
                        '<div random-icons="pencil droid trash"></div>' +
                        '<input type="text">' +
                    '</div>' +
                '</script>' +
            '</div>';

    function setup(html) {
        var content = document.createElement('div'), ext;
        content.className = ux.datagrid.options.contentClass;
        content = angular.element(content);
        element = angular.element(html);
        ext = {
            options: angular.copy(ux.datagrid.options),
            element: element,
            getContent: function () {
                return content;
            }
        };
        ext.element.append(content);
        document.body.appendChild(element[0]);
        model = ux.datagrid.coreAddons.templateModel(ext);
        model.createTemplates();
    }

    afterEach(function () {
        element.remove();
    });

    it("should create a template from the html string", function() {
        setup(html1);
        expect(model.getTemplateByName('default')).toBeDefined();
    });

    it("getTemplateByName should get a template by name", function() {
        setup(html1);
        expect(model.getTemplateByName('template1').name).toBe('template1');
    });

    it("should get a template from am object with an _template property", function() {
        setup(html1);
        expect(model.getTemplate({_template: 'template1'}).name).toBe('template1');
    });

    it("templateCount should count the templates", function() {
        setup(html1);
        expect(model.templateCount()).toBe(2);
    });

    it("getTemplateHeight should return default height if no template is specified", function() {
        setup(html1);
        expect(model.getTemplateHeight({})).toBe(10);
    });

    it("getTemplateHeight should return the height of the correct template", function() {
        setup(html1);
        expect(model.getTemplateHeight({_template:'template1'})).toBe(20);
    });

    it("dynamicHeights should return true if the templates have different heights", function() {
        setup(html1);
        expect(model.dynamicHeights()).toBe(true);
    });

    it("should work without the data- in front of the attributes", function() {
        setup(html2);
        expect(model.templateCount()).toBe(2);
    });

    it("dynamicHeights should return false if the templates have the same heights", function() {
        setup(html2);
        expect(model.dynamicHeights()).toBe(false);
    });

    it("averageTemplateHeight should return 15", function() {
        setup(html1);
        expect(model.averageTemplateHeight()).toBe(15);
    });

    it("should allow a custom getTemplate function", function() {
        setup(html2);
        var template;
        model.getTemplate = function (item) {
            return model.getTemplateByName("template1");
        };
        template = model.getTemplate({_template:"default"});
        expect(template.name).toBe("template1");
    });
});