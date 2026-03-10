const CHAPTERS = [

// ========== FOUNDATIONS ==========

{
  id: 0,
  type: 'intro',
  part: 'Foundations',
  title: 'OOP Basics',
  subtitle: { en: 'Pillars of Object-Oriented Programming', cn: '面向对象编程的支柱' },
  content: `
    <h2><span class="en">What is OOP?</span><span class="cn">什么是面向对象编程？</span></h2>
    <p>
      <span class="en">Object-Oriented Programming (OOP) is a paradigm based on the concept of wrapping pieces of data and behavior related to that data into special bundles called <strong>objects</strong>. Objects are constructed from "blueprints" called <strong>classes</strong>.</span>
      <span class="cn">面向对象编程（OOP）是一种基于将数据和与数据相关的行为包装到称为<strong>对象</strong>的特殊包中的范式。对象根据称为<strong>类</strong>的"蓝图"构建。</span>
    </p>

    <h2><span class="en">Four Pillars of OOP</span><span class="cn">OOP 的四大支柱</span></h2>

    <div class="principle-card">
      <div class="principle-letter">A</div>
      <div class="principle-body">
        <h4><span class="en">Abstraction</span><span class="cn">抽象</span></h4>
        <p><span class="en">A model of a real-world object or phenomenon, limited to a specific context, which represents all details relevant to this context with high accuracy and omits all the rest.</span>
        <span class="cn">对真实世界对象或现象的模型，限于特定上下文，以高精度表示与该上下文相关的所有细节，省略其余部分。</span></p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-letter">E</div>
      <div class="principle-body">
        <h4><span class="en">Encapsulation</span><span class="cn">封装</span></h4>
        <p><span class="en">The ability of an object to hide parts of its state and behaviors from other objects, exposing only a limited interface to the rest of the program.</span>
        <span class="cn">对象隐藏其部分状态和行为的能力，仅向程序的其余部分公开有限的接口。</span></p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-letter">I</div>
      <div class="principle-body">
        <h4><span class="en">Inheritance</span><span class="cn">继承</span></h4>
        <p><span class="en">The ability to build new classes on top of existing ones. The main benefit is code reuse. Subclasses inherit the interface and implementation of their parent class, and can extend it.</span>
        <span class="cn">在现有类的基础上构建新类的能力。主要好处是代码复用。子类继承父类的接口和实现，并可以扩展它。</span></p>
      </div>
    </div>
    <div class="principle-card">
      <div class="principle-letter">P</div>
      <div class="principle-body">
        <h4><span class="en">Polymorphism</span><span class="cn">多态</span></h4>
        <p><span class="en">The ability of a program to detect the real class of an object and call its implementation even when its real type is unknown in the current context.</span>
        <span class="cn">程序检测对象的实际类并调用其实现的能力，即使在当前上下文中其实际类型未知。</span></p>
      </div>
    </div>

    <h2><span class="en">Relations Between Objects</span><span class="cn">对象之间的关系</span></h2>
    <p>
      <span class="en">From weakest to strongest coupling:</span>
      <span class="cn">从最弱到最强的耦合关系：</span>
    </p>
    <div class="rel-chain">
      <span style="background:#3498db">Dependency</span>
      <span class="arrow">&rarr;</span>
      <span style="background:#2ecc71">Association</span>
      <span class="arrow">&rarr;</span>
      <span style="background:#e67e22">Aggregation</span>
      <span class="arrow">&rarr;</span>
      <span style="background:#e74c3c">Composition</span>
      <span class="arrow">&rarr;</span>
      <span style="background:#8e44ad">Inheritance</span>
    </div>
    <ul>
      <li><span class="en"><strong>Dependency:</strong> Class A uses Class B. Changes to B may affect A.</span><span class="cn"><strong>依赖：</strong>类 A 使用类 B。对 B 的更改可能影响 A。</span></li>
      <li><span class="en"><strong>Association:</strong> Object A knows about and interacts with Object B. A permanent link.</span><span class="cn"><strong>关联：</strong>对象 A 知道并与对象 B 交互。一种永久联系。</span></li>
      <li><span class="en"><strong>Aggregation:</strong> "Has-a" relationship. Components can exist independently of the container.</span><span class="cn"><strong>聚合：</strong>"有一个"关系。组件可以独立于容器存在。</span></li>
      <li><span class="en"><strong>Composition:</strong> Components are managed by the container and cannot exist independently.</span><span class="cn"><strong>组合：</strong>组件由容器管理，不能独立存在。</span></li>
      <li><span class="en"><strong>Inheritance:</strong> Strongest coupling. Subclass inherits interface and implementation of parent class.</span><span class="cn"><strong>继承：</strong>最强耦合。子类继承父类的接口和实现。</span></li>
    </ul>
  `
},

{
  id: 1,
  type: 'intro',
  part: 'Foundations',
  title: 'SOLID Principles',
  subtitle: { en: 'Five Design Principles for Better Software', cn: '更好软件的五个设计原则' },
  content: `
    <p>
      <span class="en">SOLID is a mnemonic for five design principles intended to make object-oriented designs more understandable, flexible, and maintainable.</span>
      <span class="cn">SOLID 是五个设计原则的助记符，旨在使面向对象设计更加易于理解、灵活和可维护。</span>
    </p>

    <div class="principle-card">
      <div class="principle-letter">S</div>
      <div class="principle-body">
        <h4>Single Responsibility Principle</h4>
        <p><span class="en">A class should have just one reason to change. If a class does too many things, you have to change it every time one of these things changes, risking breaking other parts.</span>
        <span class="cn">一个类应该只有一个引起变化的原因。如果一个类做太多事情，每次其中一件事变化时都必须修改它，有破坏其他部分的风险。</span></p>
      </div>
    </div>

    <div class="principle-card">
      <div class="principle-letter">O</div>
      <div class="principle-body">
        <h4>Open/Closed Principle</h4>
        <p><span class="en">Classes should be open for extension but closed for modification. The goal is to keep existing code from breaking when you implement new features &mdash; use interfaces and abstract classes instead of modifying existing code.</span>
        <span class="cn">类应该对扩展开放，对修改关闭。目标是在实现新功能时不破坏现有代码——使用接口和抽象类而不是修改现有代码。</span></p>
      </div>
    </div>

    <div class="principle-card">
      <div class="principle-letter">L</div>
      <div class="principle-body">
        <h4>Liskov Substitution Principle</h4>
        <p><span class="en">When extending a class, you should be able to pass objects of the subclass in place of objects of the parent class without breaking the client code. The subclass should extend the base behavior, not replace it.</span>
        <span class="cn">扩展类时，应该能够将子类的对象替代父类对象而不破坏客户端代码。子类应该扩展基础行为，而不是替换它。</span></p>
      </div>
    </div>

    <div class="principle-card">
      <div class="principle-letter">I</div>
      <div class="principle-body">
        <h4>Interface Segregation Principle</h4>
        <p><span class="en">Clients shouldn&rsquo;t be forced to depend on methods they do not use. Break down &ldquo;fat&rdquo; interfaces into more granular and specific ones.</span>
        <span class="cn">客户端不应该被迫依赖它们不使用的方法。将"胖"接口分解为更细粒度和更具体的接口。</span></p>
      </div>
    </div>

    <div class="principle-card">
      <div class="principle-letter">D</div>
      <div class="principle-body">
        <h4>Dependency Inversion Principle</h4>
        <p><span class="en">High-level classes shouldn&rsquo;t depend on low-level classes. Both should depend on abstractions. Abstractions shouldn&rsquo;t depend on details. Details should depend on abstractions.</span>
        <span class="cn">高层类不应该依赖低层类。两者都应该依赖抽象。抽象不应该依赖细节。细节应该依赖抽象。</span></p>
      </div>
    </div>
  `
},

// ========== CREATIONAL PATTERNS ==========

{
  id: 2, type: 'pattern', part: 'Creational Patterns',
  category: 'creational', categoryLabel: { en: 'Creational', cn: '创建型' },
  title: 'Factory Method',
  subtitle: { en: 'aka Virtual Constructor', cn: '工厂方法 / 虚拟构造函数' },
  description: {
    en: 'Defines an interface for creating an object, but lets subclasses decide which class to instantiate. Factory Method lets a class defer instantiation to subclasses.',
    cn: '定义一个创建对象的接口，但让子类决定实例化哪个类。工厂方法让类将实例化推迟到子类。'
  },
  problem: {
    en: 'Imagine you\'re creating a logistics management application. The first version can only handle transportation by <strong>Trucks</strong>, so the bulk of your code lives inside the <code>Truck</code> class. Later, you need to add <strong>Ships</strong>. Adding a new transport class requires changes throughout the codebase &mdash; tight coupling to concrete classes makes the code rigid.',
    cn: '假设你正在创建一个物流管理应用。第一个版本只能处理<strong>卡车</strong>运输，因此大部分代码位于 <code>Truck</code> 类中。后来需要添加<strong>轮船</strong>。添加新的运输类需要在整个代码库中进行更改——与具体类的紧密耦合使代码变得僵硬。'
  },
  solution: {
    en: 'The Factory Method pattern suggests replacing direct object construction calls with calls to a special <em>factory method</em>. Objects are still created via <code>new</code>, but from within the factory method. Subclasses can override the factory method to change the class of products being created.',
    cn: '工厂方法模式建议用对特殊<em>工厂方法</em>的调用来替换直接的对象构造调用。对象仍然通过 <code>new</code> 创建，但在工厂方法内部。子类可以重写工厂方法以更改所创建产品的类。'
  },
  codeIntro: {
    en: 'Cross-platform dialog example: the base Dialog class uses a factory method to create buttons. Subclasses produce platform-specific buttons.',
    cn: '跨平台对话框示例：基类 Dialog 使用工厂方法创建按钮。子类生成特定平台的按钮。'
  },
  pseudocode: `// The creator class declares the factory method
class Dialog is
    abstract method createButton(): Button

    // Business logic uses the factory method product
    method render() is
        Button okButton = createButton()
        okButton.onClick(closeDialog)
        okButton.render()

// Concrete creators override the factory method
class WindowsDialog extends Dialog is
    method createButton(): Button is
        return new WindowsButton()

class WebDialog extends Dialog is
    method createButton(): Button is
        return new HTMLButton()

// Product interface
interface Button is
    method render()
    method onClick(f)

class WindowsButton implements Button is
    method render() is
        // Render a button in Windows style
    method onClick(f) is
        // Bind native OS click event

class HTMLButton implements Button is
    method render() is
        // Return an HTML representation of a button
    method onClick(f) is
        // Bind a web browser click event

// Client code
class Application is
    field dialog: Dialog

    method initialize() is
        config = readApplicationConfigFile()
        if (config.OS == "Windows") then
            dialog = new WindowsDialog()
        else if (config.OS == "Web") then
            dialog = new WebDialog()
        else
            throw new Exception("Unknown OS")

    method main() is
        this.initialize()
        dialog.render()`,
  pros: [
    { en: 'Avoid tight coupling between the creator and the concrete products.', cn: '避免创建者与具体产品之间的紧密耦合。' },
    { en: '<strong>Single Responsibility.</strong> Move product creation code into one place.', cn: '<strong>单一职责原则。</strong>将产品创建代码移到一个地方。' },
    { en: '<strong>Open/Closed.</strong> Introduce new product types without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新的产品类型。' }
  ],
  cons: [
    { en: 'Code may become more complicated since you need many new subclasses to implement the pattern.', cn: '由于需要引入许多新的子类来实现该模式，代码可能会变得更加复杂。' }
  ],
  applicability: [
    { en: 'Use when you don\'t know beforehand the exact types of objects your code will work with.', cn: '当你事先不知道代码将与哪些确切类型的对象一起工作时使用。' },
    { en: 'Use when you want to let users extend your library or framework\'s internal components.', cn: '当你想让用户扩展你的库或框架的内部组件时使用。' },
    { en: 'Use when you want to save system resources by reusing existing objects instead of rebuilding them.', cn: '当你想通过复用现有对象而不是重新构建来节省系统资源时使用。' }
  ]
},

{
  id: 3, type: 'pattern', part: 'Creational Patterns',
  category: 'creational', categoryLabel: { en: 'Creational', cn: '创建型' },
  title: 'Abstract Factory',
  subtitle: { en: 'Families of related objects', cn: '抽象工厂 / 相关对象族' },
  description: {
    en: 'Provides an interface for creating families of related or dependent objects without specifying their concrete classes.',
    cn: '提供一个创建相关或依赖对象族的接口，而无需指定它们的具体类。'
  },
  problem: {
    en: 'Imagine you\'re creating a furniture shop simulator. Your code consists of classes representing: <strong>Chair + Sofa + CoffeeTable</strong>. Each product comes in variants: <em>Modern, Victorian, ArtDeco</em>. You need to create individual furniture objects that match other objects of the same family.',
    cn: '想象你正在创建一个家具商店模拟器。你的代码由以下类组成：<strong>椅子 + 沙发 + 咖啡桌</strong>。每种产品有不同变体：<em>现代、维多利亚、装饰艺术</em>。你需要创建与同一系列其他对象匹配的单个家具对象。'
  },
  solution: {
    en: 'Declare interfaces for each distinct product (Chair, Sofa, Table). Then create an <strong>Abstract Factory</strong> interface with creation methods for all products. For each variant, create a separate factory class (ModernFurnitureFactory, VictorianFurnitureFactory, etc.) that returns products of a particular style.',
    cn: '为每种不同的产品（椅子、沙发、桌子）声明接口。然后创建一个包含所有产品创建方法的<strong>抽象工厂</strong>接口。为每种变体创建单独的工厂类（现代家具工厂、维多利亚家具工厂等），返回特定风格的产品。'
  },
  codeIntro: {
    en: 'Cross-platform UI elements: factories produce matching buttons and checkboxes for Windows or Mac.',
    cn: '跨平台 UI 元素：工厂为 Windows 或 Mac 生产匹配的按钮和复选框。'
  },
  pseudocode: `// Abstract factory interface
interface GUIFactory is
    method createButton(): Button
    method createCheckbox(): Checkbox

// Concrete factories produce a family of products
class WinFactory implements GUIFactory is
    method createButton(): Button is
        return new WinButton()
    method createCheckbox(): Checkbox is
        return new WinCheckbox()

class MacFactory implements GUIFactory is
    method createButton(): Button is
        return new MacButton()
    method createCheckbox(): Checkbox is
        return new MacCheckbox()

// Product interfaces
interface Button is
    method paint()

interface Checkbox is
    method paint()

// Concrete products
class WinButton implements Button is
    method paint() is
        // Render a button in Windows style
class MacButton implements Button is
    method paint() is
        // Render a button in macOS style

class WinCheckbox implements Checkbox is
    method paint() is
        // Render a checkbox in Windows style
class MacCheckbox implements Checkbox is
    method paint() is
        // Render a checkbox in macOS style

// Client code works with factories via abstract interface
class Application is
    private field factory: GUIFactory
    private field button: Button

    constructor Application(factory: GUIFactory) is
        this.factory = factory

    method createUI() is
        this.button = factory.createButton()

    method paint() is
        button.paint()`,
  pros: [
    { en: 'Products from a factory are guaranteed to be compatible with each other.', cn: '工厂生产的产品保证相互兼容。' },
    { en: 'Avoid tight coupling between concrete products and client code.', cn: '避免具体产品与客户端代码之间的紧密耦合。' },
    { en: '<strong>Single Responsibility.</strong> Extract product creation code into one place.', cn: '<strong>单一职责原则。</strong>将产品创建代码提取到一个地方。' },
    { en: '<strong>Open/Closed.</strong> Introduce new product variants without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新的产品变体。' }
  ],
  cons: [
    { en: 'The code may become more complicated since you need to introduce many new interfaces and classes.', cn: '代码可能变得更加复杂，因为需要引入许多新的接口和类。' }
  ]
},

{
  id: 4, type: 'pattern', part: 'Creational Patterns',
  category: 'creational', categoryLabel: { en: 'Creational', cn: '创建型' },
  title: 'Builder',
  subtitle: { en: 'Step-by-step construction', cn: '生成器 / 分步构造' },
  description: {
    en: 'Lets you construct complex objects step by step. Allows producing different types and representations of an object using the same construction code.',
    cn: '让你分步构建复杂对象。允许使用相同的构建代码生产不同类型和表现形式的对象。'
  },
  problem: {
    en: 'Imagine a complex object that requires laborious, step-by-step initialization of many fields and nested objects. Such code is usually buried inside a <strong>monstrous constructor</strong> with lots of parameters &mdash; or scattered all over the client code. Creating subclasses for every possible configuration would make the program too complex.',
    cn: '想象一个需要费力地逐步初始化许多字段和嵌套对象的复杂对象。这样的代码通常被埋在一个<strong>巨大的构造函数</strong>中——或者分散在客户端代码中。为每种可能的配置创建子类会使程序过于复杂。'
  },
  solution: {
    en: 'Extract the object construction code into separate <strong>builder</strong> objects. The pattern organizes construction into a set of steps (<code>buildWalls</code>, <code>buildDoor</code>, etc.). You only call the steps needed. A <strong>Director</strong> class can define the order of building steps.',
    cn: '将对象构建代码提取到单独的<strong>生成器</strong>对象中。该模式将构建过程组织为一组步骤（<code>buildWalls</code>、<code>buildDoor</code> 等）。你只调用需要的步骤。<strong>主管</strong>类可以定义构建步骤的顺序。'
  },
  codeIntro: {
    en: 'Building cars and their manuals step by step using the same construction process.',
    cn: '使用相同的构建过程逐步构建汽车及其手册。'
  },
  pseudocode: `interface Builder is
    method reset()
    method setSeats(number)
    method setEngine(engine: Engine)
    method setTripComputer()
    method setGPS()

class CarBuilder implements Builder is
    private field car: Car
    constructor CarBuilder() is
        this.reset()
    method reset() is
        this.car = new Car()
    method setSeats(number) is
        // Set the number of seats
    method setEngine(engine) is
        // Install a given engine
    method setTripComputer() is
        // Install a trip computer
    method setGPS() is
        // Install a GPS
    method getProduct(): Car is
        product = this.car
        this.reset()
        return product

// The director defines the order of building steps
class Director is
    private field builder: Builder

    method setBuilder(builder: Builder) is
        this.builder = builder

    method constructSportsCar(builder) is
        builder.reset()
        builder.setSeats(2)
        builder.setEngine(new SportEngine())
        builder.setTripComputer()
        builder.setGPS()

    method constructSUV(builder) is
        builder.reset()
        builder.setSeats(4)
        builder.setEngine(new SUVEngine())
        builder.setGPS()

// Client code
class Application is
    method makeCar() is
        director = new Director()

        builder = new CarBuilder()
        director.constructSportsCar(builder)
        car = builder.getProduct()

        builder = new CarManualBuilder()
        director.constructSportsCar(builder)
        manual = builder.getProduct()`,
  pros: [
    { en: 'Construct objects step-by-step, defer construction steps or run steps recursively.', cn: '可以分步构建对象，推迟构建步骤或递归运行步骤。' },
    { en: 'Reuse the same construction code for building various representations of products.', cn: '可以复用相同的构建代码来构建各种产品表现形式。' },
    { en: '<strong>Single Responsibility.</strong> Isolate complex construction from business logic.', cn: '<strong>单一职责原则。</strong>将复杂构建与业务逻辑隔离。' }
  ],
  cons: [
    { en: 'Overall complexity of the code increases since the pattern requires creating multiple new classes.', cn: '由于该模式需要创建多个新类，代码整体复杂度会增加。' }
  ]
},

{
  id: 5, type: 'pattern', part: 'Creational Patterns',
  category: 'creational', categoryLabel: { en: 'Creational', cn: '创建型' },
  title: 'Prototype',
  subtitle: { en: 'Clone existing objects', cn: '原型 / 克隆现有对象' },
  description: {
    en: 'Lets you copy existing objects without making your code dependent on their classes. Delegates the cloning process to the actual objects being cloned.',
    cn: '让你复制现有对象而不使代码依赖于它们的类。将克隆过程委派给被克隆的实际对象。'
  },
  problem: {
    en: 'You want to create an exact copy of an object. You\'d have to create a new object of the same class, go through all the fields of the original and copy their values. But some fields may be private. And your code becomes dependent on the concrete class &mdash; you may not even know the concrete class if you only have an interface reference.',
    cn: '你想创建一个对象的精确副本。你必须创建同一类的新对象，遍历原始对象的所有字段并复制它们的值。但有些字段可能是私有的。而且你的代码会依赖于具体类——如果你只有接口引用，甚至可能不知道具体类。'
  },
  solution: {
    en: 'The Prototype pattern delegates the cloning process to the actual objects being cloned. The pattern declares a common interface (<code>clone</code>) for all objects that support cloning. An object that supports cloning is called a <em>prototype</em>.',
    cn: '原型模式将克隆过程委派给被克隆的实际对象。该模式为所有支持克隆的对象声明一个通用接口（<code>clone</code>）。支持克隆的对象称为<em>原型</em>。'
  },
  codeIntro: {
    en: 'Cloning geometric shapes: each shape knows how to clone itself via a copy constructor.',
    cn: '克隆几何图形：每个图形都知道如何通过拷贝构造函数克隆自身。'
  },
  pseudocode: `abstract class Shape is
    field X: int
    field Y: int
    field color: string

    // Regular constructor
    constructor Shape() is
        // ...

    // Prototype constructor: init with existing object's values
    constructor Shape(source: Shape) is
        this()
        this.X = source.X
        this.Y = source.Y
        this.color = source.color

    abstract method clone(): Shape

class Rectangle extends Shape is
    field width: int
    field height: int

    constructor Rectangle(source: Rectangle) is
        super(source)
        this.width = source.width
        this.height = source.height

    method clone(): Shape is
        return new Rectangle(this)

class Circle extends Shape is
    field radius: int

    constructor Circle(source: Circle) is
        super(source)
        this.radius = source.radius

    method clone(): Shape is
        return new Circle(this)

// Client code
class Application is
    field shapes: array of Shape

    constructor Application() is
        circle = new Circle()
        circle.X = 10
        circle.Y = 10
        circle.radius = 20
        shapes.add(circle)

        anotherCircle = circle.clone()
        shapes.add(anotherCircle)

        rect = new Rectangle()
        rect.width = 10
        rect.height = 20
        shapes.add(rect)

    method businessLogic() is
        // Prototype rocks because it lets you clone without
        // knowing the actual type of the objects
        shapesCopy = new array of Shape
        foreach (s in shapes) do
            shapesCopy.add(s.clone())`,
  pros: [
    { en: 'Clone objects without coupling to their concrete classes.', cn: '无需耦合到具体类即可克隆对象。' },
    { en: 'Get rid of repeated initialization code in favor of cloning pre-built prototypes.', cn: '用克隆预构建原型来消除重复的初始化代码。' },
    { en: 'Produce complex objects more conveniently.', cn: '更方便地生产复杂对象。' }
  ],
  cons: [
    { en: 'Cloning complex objects with circular references might be very tricky.', cn: '克隆具有循环引用的复杂对象可能非常棘手。' }
  ]
},

{
  id: 6, type: 'pattern', part: 'Creational Patterns',
  category: 'creational', categoryLabel: { en: 'Creational', cn: '创建型' },
  title: 'Singleton',
  subtitle: { en: 'Single instance only', cn: '单例 / 唯一实例' },
  description: {
    en: 'Ensures that a class has only one instance, while providing a global access point to this instance.',
    cn: '确保一个类只有一个实例，同时提供对该实例的全局访问点。'
  },
  problem: {
    en: 'The Singleton pattern solves two problems at once (violating Single Responsibility): <strong>1)</strong> Ensure a class has just a single instance (e.g., controlling access to a shared database). <strong>2)</strong> Provide a global access point to that instance, like a global variable but protected from being overwritten.',
    cn: '单例模式同时解决两个问题（违反单一职责原则）：<strong>1)</strong> 确保一个类只有一个实例（例如控制对共享数据库的访问）。<strong>2)</strong> 提供对该实例的全局访问点，像全局变量但受到保护不被覆盖。'
  },
  solution: {
    en: 'Make the default constructor private. Create a static creation method that acts as a constructor &mdash; it calls the private constructor to create an object and saves it in a static field. All following calls return the cached object.',
    cn: '将默认构造函数设为私有。创建一个充当构造函数的静态创建方法——它调用私有构造函数创建对象并将其保存在静态字段中。后续所有调用都返回缓存的对象。'
  },
  codeIntro: {
    en: 'Database connection singleton with lazy initialization and thread safety.',
    cn: '具有延迟初始化和线程安全的数据库连接单例。'
  },
  pseudocode: `class Database is
    private static field instance: Database

    // Private constructor prevents direct construction
    private constructor Database() is
        // Initialization code (connect to database server, etc.)

    // Static creation method acts as constructor
    public static method getInstance(): Database is
        if (Database.instance == null) then
            acquireThreadLock() // thread safety
            if (Database.instance == null) then
                Database.instance = new Database()
        return Database.instance

    public method query(sql) is
        // All database queries go through this method

// Client code
class Application is
    method main() is
        Database foo = Database.getInstance()
        foo.query("SELECT ...")
        // ...
        Database bar = Database.getInstance()
        bar.query("SELECT ...")
        // foo and bar contain the same object`,
  pros: [
    { en: 'Guarantees that a class has only a single instance.', cn: '保证一个类只有一个实例。' },
    { en: 'Global access point to that instance.', cn: '提供对该实例的全局访问点。' },
    { en: 'The singleton object is initialized only when it\'s requested for the first time.', cn: '单例对象仅在首次被请求时才初始化。' }
  ],
  cons: [
    { en: 'Violates the Single Responsibility Principle (solves two problems at once).', cn: '违反单一职责原则（同时解决两个问题）。' },
    { en: 'Can mask bad design, e.g., when components know too much about each other.', cn: '可能掩盖糟糕的设计，例如当组件之间了解太多。' },
    { en: 'Requires special treatment in a multithreaded environment.', cn: '在多线程环境中需要特殊处理。' },
    { en: 'May be difficult to unit test because many test frameworks rely on inheritance when producing mock objects.', cn: '可能难以进行单元测试，因为许多测试框架在生成模拟对象时依赖继承。' }
  ]
},

// ========== STRUCTURAL PATTERNS ==========

{
  id: 7, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Adapter',
  subtitle: { en: 'aka Wrapper', cn: '适配器 / 包装器' },
  description: {
    en: 'Allows objects with incompatible interfaces to collaborate. The Adapter wraps one of the objects to hide the complexity of conversion happening behind the scenes.',
    cn: '允许具有不兼容接口的对象协作。适配器包装一个对象以隐藏幕后发生的转换复杂性。'
  },
  problem: {
    en: 'You\'re creating a stock market monitoring app. The app downloads stock data from multiple sources in XML format. Then you decide to improve the app by integrating a smart analytics library &mdash; but it only works with data in JSON format. You can\'t modify the library because it\'s third-party.',
    cn: '你正在创建一个股票市场监控应用。该应用从多个来源下载 XML 格式的股票数据。然后你决定集成一个智能分析库来改进应用——但它只能处理 JSON 格式的数据。你无法修改该库因为它是第三方的。'
  },
  solution: {
    en: 'Create an <strong>adapter</strong>: a special object that converts the interface of one object so that another object can understand it. The adapter wraps one of the objects to hide the complexity of conversion. The wrapped object isn\'t even aware of the adapter.',
    cn: '创建一个<strong>适配器</strong>：一个特殊对象，转换一个对象的接口以便另一个对象可以理解。适配器包装其中一个对象以隐藏转换的复杂性。被包装的对象甚至不知道适配器的存在。'
  },
  codeIntro: {
    en: '"Square peg in a round hole" — SquarePegAdapter makes SquarePeg compatible with RoundHole.',
    cn: '"方钉圆孔"——SquarePegAdapter 使 SquarePeg 与 RoundHole 兼容。'
  },
  pseudocode: `class RoundHole is
    constructor RoundHole(radius) is
        // ...
    method getRadius() is
        // Return the radius of the hole
    method fits(peg: RoundPeg) is
        return this.getRadius() >= peg.getRadius()

class RoundPeg is
    constructor RoundPeg(radius) is
        // ...
    method getRadius() is
        // Return the radius of the peg

class SquarePeg is
    constructor SquarePeg(width) is
        // ...
    method getWidth() is
        // Return the width of the square peg

// Adapter: makes SquarePeg compatible with RoundHole
class SquarePegAdapter extends RoundPeg is
    private field peg: SquarePeg

    constructor SquarePegAdapter(peg: SquarePeg) is
        this.peg = peg

    method getRadius() is
        // Calculate a minimum circle radius that can
        // fit this square peg
        return peg.getWidth() * Math.sqrt(2) / 2

// Client code
hole = new RoundHole(5)
rpeg = new RoundPeg(5)
hole.fits(rpeg) // true

small_sqpeg = new SquarePeg(5)
large_sqpeg = new SquarePeg(10)
// hole.fits(small_sqpeg) // Won't compile (incompatible types)

small_sqpeg_adapter = new SquarePegAdapter(small_sqpeg)
large_sqpeg_adapter = new SquarePegAdapter(large_sqpeg)
hole.fits(small_sqpeg_adapter) // true
hole.fits(large_sqpeg_adapter) // false`,
  pros: [
    { en: '<strong>Single Responsibility.</strong> Separate interface conversion from primary business logic.', cn: '<strong>单一职责原则。</strong>将接口转换与主要业务逻辑分离。' },
    { en: '<strong>Open/Closed.</strong> Introduce new adapters without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新的适配器。' }
  ],
  cons: [
    { en: 'Overall complexity increases. Sometimes it\'s simpler to just change the service class to match the rest of your code.', cn: '整体复杂度增加。有时直接更改服务类以匹配代码的其余部分更简单。' }
  ]
},

{
  id: 8, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Bridge',
  subtitle: { en: 'Separate abstraction from implementation', cn: '桥接 / 分离抽象与实现' },
  description: {
    en: 'Lets you split a large class or a set of closely related classes into two separate hierarchies &mdash; abstraction and implementation &mdash; which can be developed independently of each other.',
    cn: '让你将一个大类或一组紧密相关的类拆分为两个独立的层次结构——抽象和实现——它们可以彼此独立地开发。'
  },
  problem: {
    en: 'Say you have a <code>Shape</code> class with a pair of subclasses: <code>Circle</code> and <code>Square</code>. You want to extend this to incorporate colors, so you plan to create <code>Red</code> and <code>Blue</code> shape subclasses. Since you already have two subclasses, you\'d need four class combinations: <code>BlueCircle</code>, <code>RedCircle</code>, <code>BlueSquare</code>, <code>RedSquare</code>. Adding new shapes and colors grows the hierarchy exponentially.',
    cn: '假设你有一个 <code>Shape</code> 类及一对子类：<code>Circle</code> 和 <code>Square</code>。你想扩展它以包含颜色，所以计划创建 <code>Red</code> 和 <code>Blue</code> 形状子类。由于已有两个子类，你需要四种类组合。添加新的形状和颜色会使层次结构呈指数增长。'
  },
  solution: {
    en: 'The Bridge pattern switches from inheritance to composition. Extract one of the dimensions (e.g., color) into a separate class hierarchy. The original class references an object of the new hierarchy, instead of having all of its state and behaviors within one class.',
    cn: '桥接模式从继承切换到组合。将其中一个维度（如颜色）提取到单独的类层次结构中。原始类引用新层次结构的对象，而不是将所有状态和行为放在一个类中。'
  },
  codeIntro: {
    en: 'Remote controls (abstraction) and devices (implementation) that vary independently.',
    cn: '遥控器（抽象）和设备（实现）各自独立变化。'
  },
  pseudocode: `// "Implementation" hierarchy
interface Device is
    method isEnabled()
    method enable()
    method disable()
    method getVolume()
    method setVolume(percent)

class Tv implements Device is
    // ...
class Radio implements Device is
    // ...

// "Abstraction" hierarchy
class RemoteControl is
    protected field device: Device

    constructor RemoteControl(device: Device) is
        this.device = device

    method togglePower() is
        if (device.isEnabled()) then
            device.disable()
        else
            device.enable()

    method volumeDown() is
        device.setVolume(device.getVolume() - 10)

    method volumeUp() is
        device.setVolume(device.getVolume() + 10)

// Extended abstraction
class AdvancedRemoteControl extends RemoteControl is
    method mute() is
        device.setVolume(0)

// Client code
tv = new Tv()
remote = new RemoteControl(tv)
remote.togglePower()

radio = new Radio()
remote = new AdvancedRemoteControl(radio)`,
  pros: [
    { en: 'Create platform-independent classes and apps.', cn: '创建平台无关的类和应用。' },
    { en: 'Client code works with high-level abstractions, not exposed to platform details.', cn: '客户端代码使用高层抽象，不暴露于平台细节。' },
    { en: '<strong>Open/Closed</strong> and <strong>Single Responsibility</strong> principles.', cn: '<strong>开闭原则</strong>和<strong>单一职责原则</strong>。' }
  ],
  cons: [
    { en: 'You might make the code more complicated by applying the pattern to a highly cohesive class.', cn: '对高内聚的类应用该模式可能会使代码更加复杂。' }
  ]
},

{
  id: 9, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Composite',
  subtitle: { en: 'Tree structure', cn: '组合 / 对象树' },
  description: {
    en: 'Lets you compose objects into tree structures and then work with these structures as if they were individual objects.',
    cn: '让你将对象组合成树状结构，然后像处理单个对象一样处理这些结构。'
  },
  problem: { en: 'Using the Composite pattern only makes sense when the core model of your app can be represented as a tree. For example, an order system: an order might contain simple products and boxes, and a box can also contain products and smaller boxes. How do you calculate total price?', cn: '只有当应用的核心模型可以表示为树时，使用组合模式才有意义。例如订单系统：一个订单可能包含简单产品和盒子，盒子也可以包含产品和更小的盒子。如何计算总价？' },
  solution: { en: 'Work with products and boxes through a common interface which declares a method for calculating the total price. For a product, it simply returns the product\'s price. For a box, it goes over each item in the box and returns the total.', cn: '通过声明计算总价方法的通用接口来处理产品和盒子。对于产品，直接返回价格。对于盒子，遍历盒子中的每个项目并返回总和。' },
  codeIntro: { en: 'Graphics editor: simple shapes (Dot, Circle) and compound shapes composed into a tree.', cn: '图形编辑器：简单图形（点、圆）和复合图形组合成树。' },
  pseudocode: `interface Graphic is
    method move(x, y)
    method draw()

class Dot implements Graphic is
    field x, y
    constructor Dot(x, y) is
        // ...
    method move(x, y) is
        this.x += x
        this.y += y
    method draw() is
        // Draw a dot at X and Y

class Circle extends Dot is
    field radius
    constructor Circle(x, y, radius) is
        // ...
    method draw() is
        // Draw a circle at X and Y with radius

class CompoundGraphic implements Graphic is
    field children: array of Graphic

    method add(child: Graphic) is
        children.add(child)
    method remove(child: Graphic) is
        children.remove(child)
    method move(x, y) is
        foreach (child in children) do
            child.move(x, y)
    method draw() is
        foreach (child in children) do
            child.draw()
        // Draw a dashed rectangle around all children`,
  pros: [
    { en: 'Work with complex tree structures more conveniently via polymorphism and recursion.', cn: '通过多态和递归更方便地处理复杂树结构。' },
    { en: '<strong>Open/Closed.</strong> Introduce new element types without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新的元素类型。' }
  ],
  cons: [
    { en: 'It might be difficult to provide a common interface for classes whose functionality differs too much.', cn: '可能难以为功能差异很大的类提供通用接口。' }
  ]
},

{
  id: 10, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Decorator',
  subtitle: { en: 'aka Wrapper', cn: '装饰 / 包装器' },
  description: { en: 'Lets you attach new behaviors to objects by placing these objects inside special wrapper objects that contain the behaviors.', cn: '通过将对象放入包含行为的特殊包装器对象中来为对象附加新行为。' },
  problem: { en: 'You\'re working on a notification library. Users want to receive notifications via multiple channels (SMS, Facebook, Slack) and combinations of them. Subclassing for every combination leads to a class explosion.', cn: '你正在开发一个通知库。用户希望通过多种渠道（短信、Facebook、Slack）及其组合接收通知。为每种组合创建子类会导致类爆炸。' },
  solution: { en: 'Wrapping — placing an object inside another object that adds behavior. The wrapper delegates to the wrapped object. You can stack multiple wrappers on top of each other, combining their behaviors.', cn: '包装——将对象放入另一个添加行为的对象中。包装器委派给被包装对象。可以将多个包装器叠加，组合它们的行为。' },
  codeIntro: { en: 'Data source decorators add encryption and compression in a stacked fashion.', cn: '数据源装饰器以叠加方式添加加密和压缩。' },
  pseudocode: `interface DataSource is
    method writeData(data)
    method readData(): data

class FileDataSource implements DataSource is
    constructor FileDataSource(filename) is
        // ...
    method writeData(data) is
        // Write data to file
    method readData(): data is
        // Read data from file

// Base decorator follows the same interface
class DataSourceDecorator implements DataSource is
    protected field wrappee: DataSource
    constructor DataSourceDecorator(source: DataSource) is
        wrappee = source
    method writeData(data) is
        wrappee.writeData(data)
    method readData(): data is
        return wrappee.readData()

class EncryptionDecorator extends DataSourceDecorator is
    method writeData(data) is
        // 1. Encrypt passed data
        // 2. Pass encrypted data to wrappee's writeData
    method readData(): data is
        // 1. Get data from wrappee's readData
        // 2. Decrypt and return it

class CompressionDecorator extends DataSourceDecorator is
    method writeData(data) is
        // 1. Compress passed data
        // 2. Pass compressed data to wrappee's writeData
    method readData(): data is
        // 1. Get data from wrappee's readData
        // 2. Decompress and return it

// Client code: stack decorators
source = new FileDataSource("somefile.dat")
source = new CompressionDecorator(source)
source = new EncryptionDecorator(source)
// Data written goes through: Encryption -> Compression -> File
source.writeData(salaryRecords)`,
  pros: [
    { en: 'Extend an object\'s behavior without making a new subclass.', cn: '无需创建新子类即可扩展对象行为。' },
    { en: 'Add or remove responsibilities from an object at runtime.', cn: '可在运行时添加或移除对象的职责。' },
    { en: 'Combine several behaviors by wrapping an object into multiple decorators.', cn: '通过将对象包装到多个装饰器中来组合多种行为。' },
    { en: '<strong>Single Responsibility.</strong> Divide a monolithic class into several smaller classes.', cn: '<strong>单一职责原则。</strong>将单一庞大类分成多个更小的类。' }
  ],
  cons: [
    { en: 'It\'s hard to remove a specific wrapper from the wrappers stack.', cn: '难以从包装器栈中移除特定的包装器。' },
    { en: 'Hard to implement a decorator in such a way that its behavior doesn\'t depend on the order in the stack.', cn: '难以实现行为不依赖于栈中顺序的装饰器。' }
  ]
},

{
  id: 11, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Facade',
  subtitle: { en: 'Simplified interface', cn: '外观 / 简化接口' },
  description: { en: 'Provides a simplified interface to a library, a framework, or any other complex set of classes.', cn: '为库、框架或任何其他复杂的类集合提供简化的接口。' },
  problem: { en: 'You need to make your code work with a broad set of objects belonging to a sophisticated library or framework. Normally, you\'d need to initialize all those objects, manage dependencies, execute methods in the correct order, etc.', cn: '你需要让代码与属于复杂库或框架的大量对象一起工作。通常，你需要初始化所有这些对象、管理依赖关系、按正确顺序执行方法等。' },
  solution: { en: 'A facade is a class that provides a simple interface to a complex subsystem. The facade delegates calls to appropriate objects within the subsystem and manages their lifecycle.', cn: '外观是一个为复杂子系统提供简单接口的类。外观将调用委派给子系统中的适当对象并管理它们的生命周期。' },
  codeIntro: { en: 'A VideoConverter facade simplifies interaction with a complex video conversion framework.', cn: 'VideoConverter 外观简化了与复杂视频转换框架的交互。' },
  pseudocode: `class VideoFile is
    // ...
class OggCompressionCodec is
    // ...
class MPEG4CompressionCodec is
    // ...
class CodecFactory is
    // ...
class BitrateReader is
    // ...
class AudioMixer is
    // ...

// Facade provides a simple interface to the complex framework
class VideoConverter is
    method convert(filename, format): File is
        file = new VideoFile(filename)
        sourceCodec = new CodecFactory.extract(file)

        if (format == "mp4")
            destinationCodec = new MPEG4CompressionCodec()
        else
            destinationCodec = new OggCompressionCodec()

        buffer = BitrateReader.read(filename, sourceCodec)
        result = BitrateReader.convert(buffer, destinationCodec)
        result = (new AudioMixer()).fix(result)
        return new File(result)

// Client code
class Application is
    method main() is
        convertor = new VideoConverter()
        mp4 = convertor.convert("funny-cats-video.ogg", "mp4")
        mp4.save()`,
  pros: [
    { en: 'Isolate your code from the complexity of a subsystem.', cn: '将代码与子系统的复杂性隔离。' }
  ],
  cons: [
    { en: 'A facade can become a god object coupled to all classes of an app.', cn: '外观可能成为与应用所有类耦合的上帝对象。' }
  ]
},

{
  id: 12, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Flyweight',
  subtitle: { en: 'Shared state / Cache', cn: '享元 / 共享状态' },
  description: { en: 'Lets you fit more objects into the available amount of RAM by sharing common parts of state between multiple objects instead of keeping all of the data in each object.', cn: '通过在多个对象之间共享状态的公共部分，而不是将所有数据保存在每个对象中，让你在可用的 RAM 中容纳更多对象。' },
  problem: { en: 'You create a particle system with millions of Bullet/Missile/Shrapnel objects. Each stores color, sprite, position, direction, speed. Most of the data (color, sprite) is identical across many objects, wasting huge amounts of RAM.', cn: '你创建了一个包含数百万子弹/导弹/弹片对象的粒子系统。每个对象存储颜色、精灵、位置、方向、速度。大部分数据（颜色、精灵）在许多对象中是相同的，浪费大量 RAM。' },
  solution: { en: 'The constant data (intrinsic state) stays inside the flyweight object. The contextual data (extrinsic state) is passed to the flyweight by client code. A Flyweight Factory manages a pool of existing flyweight objects.', cn: '常量数据（内在状态）留在享元对象内部。上下文数据（外在状态）由客户端代码传递给享元。享元工厂管理现有享元对象的池。' },
  codeIntro: { en: 'Rendering millions of trees: TreeType (shared intrinsic state) vs Tree (unique extrinsic state).', cn: '渲染数百万棵树：TreeType（共享内在状态）与 Tree（唯一外在状态）。' },
  pseudocode: `// Flyweight class contains shared state
class TreeType is
    field name: string
    field color: string
    field texture: string

    constructor TreeType(name, color, texture) is
        // ...

    method draw(canvas, x, y) is
        // 1. Create a bitmap from type, color, texture
        // 2. Draw the bitmap on the canvas at x, y

// Flyweight factory decides whether to reuse or create
class TreeFactory is
    static field treeTypes: collection of TreeType

    static method getTreeType(name, color, texture): TreeType is
        type = treeTypes.find(name, color, texture)
        if (type == null) then
            type = new TreeType(name, color, texture)
            treeTypes.add(type)
        return type

// Each tree stores only extrinsic state + reference to flyweight
class Tree is
    field x: int
    field y: int
    field type: TreeType

    constructor Tree(x, y, type) is
        // ...
    method draw(canvas) is
        type.draw(canvas, this.x, this.y)

class Forest is
    field trees: collection of Tree

    method plantTree(x, y, name, color, texture) is
        type = TreeFactory.getTreeType(name, color, texture)
        tree = new Tree(x, y, type)
        trees.add(tree)

    method draw(canvas) is
        foreach (tree in trees) do
            tree.draw(canvas)`,
  pros: [
    { en: 'You can save lots of RAM, assuming your program has tons of similar objects.', cn: '假设程序有大量相似对象，可以节省大量 RAM。' }
  ],
  cons: [
    { en: 'You might be trading RAM over CPU cycles when some context data needs to be recalculated.', cn: '当某些上下文数据需要重新计算时，可能用 CPU 换 RAM。' },
    { en: 'The code becomes much more complicated. New team members will wonder why the state is separated in such a way.', cn: '代码变得更加复杂。新团队成员会疑惑为什么要这样分离状态。' }
  ]
},

{
  id: 13, type: 'pattern', part: 'Structural Patterns',
  category: 'structural', categoryLabel: { en: 'Structural', cn: '结构型' },
  title: 'Proxy',
  subtitle: { en: 'Access control / Placeholder', cn: '代理 / 访问控制' },
  description: { en: 'Lets you provide a substitute or placeholder for another object. A proxy controls access to the original object, allowing you to perform something either before or after the request gets through to the original object.', cn: '让你提供另一个对象的替代品或占位符。代理控制对原始对象的访问，允许你在请求到达原始对象之前或之后执行某些操作。' },
  problem: { en: 'You have a massive object that consumes a lot of system resources. You need it from time to time, but not always. You could implement lazy initialization, but all clients would need to have deferred initialization code, resulting in a lot of duplication.', cn: '你有一个消耗大量系统资源的巨大对象。你偶尔需要它，但不是总是。你可以实现延迟初始化，但所有客户端都需要延迟初始化代码，导致大量重复。' },
  solution: { en: 'Create a proxy class with the same interface as the original service object. The proxy delegates all real work to the service object, but adds something before or after (lazy loading, caching, access control, logging).', cn: '创建一个与原始服务对象具有相同接口的代理类。代理将所有实际工作委派给服务对象，但在之前或之后添加一些操作（延迟加载、缓存、访问控制、日志记录）。' },
  codeIntro: { en: 'A caching proxy for a third-party video download service.', cn: '第三方视频下载服务的缓存代理。' },
  pseudocode: `interface ThirdPartyTVLib is
    method listVideos()
    method getVideoInfo(id)
    method downloadVideo(id)

class ThirdPartyTVClass implements ThirdPartyTVLib is
    method listVideos() is
        // Send an API request to YouTube
    method getVideoInfo(id) is
        // Get metadata about some video
    method downloadVideo(id) is
        // Download a video file from YouTube

// Caching proxy
class CachedTVClass implements ThirdPartyTVLib is
    private field service: ThirdPartyTVLib
    private field listCache, videoCache
    field needReset: boolean

    constructor CachedTVClass(service: ThirdPartyTVLib) is
        this.service = service

    method listVideos() is
        if (listCache == null or needReset)
            listCache = service.listVideos()
        return listCache

    method getVideoInfo(id) is
        if (videoCache == null or needReset)
            videoCache = service.getVideoInfo(id)
        return videoCache

    method downloadVideo(id) is
        if (not downloadExists(id) or needReset)
            service.downloadVideo(id)

// Client code
class TVManager is
    protected field service: ThirdPartyTVLib

    constructor TVManager(service: ThirdPartyTVLib) is
        this.service = service

    method renderListPanel() is
        list = service.listVideos()
        // Render the list of video thumbnails`,
  pros: [
    { en: 'Control the service object without clients knowing about it.', cn: '在客户端不知情的情况下控制服务对象。' },
    { en: 'Manage the lifecycle of the service object when clients don\'t care about it.', cn: '在客户端不关心时管理服务对象的生命周期。' },
    { en: '<strong>Open/Closed.</strong> Introduce new proxies without changing the service or clients.', cn: '<strong>开闭原则。</strong>无需更改服务或客户端即可引入新代理。' }
  ],
  cons: [
    { en: 'The code may become more complicated since you need to introduce a lot of new classes.', cn: '代码可能变得更复杂，因为需要引入很多新类。' },
    { en: 'The response from the service might get delayed.', cn: '服务的响应可能会延迟。' }
  ]
},

// ========== BEHAVIORAL PATTERNS ==========

{
  id: 14, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Chain of Responsibility',
  subtitle: { en: 'Pass along a chain', cn: '责任链 / 沿链传递' },
  description: { en: 'Lets you pass requests along a chain of handlers. Upon receiving a request, each handler decides either to process it or to pass it to the next handler in the chain.', cn: '让你沿着处理者链传递请求。收到请求后，每个处理者决定要么处理请求，要么将其传递给链中的下一个处理者。' },
  problem: { en: 'You\'re building an online ordering system. You want to restrict access so only authenticated users can create orders. Also admins should have full access. You end up with a sequence of checks: authentication, authorization, validation, caching. The code grows into a monolithic mess.', cn: '你正在构建一个在线订购系统。你想限制访问以便只有经过认证的用户才能创建订单。管理员应该有完全访问权限。你最终得到一系列检查：认证、授权、验证、缓存。代码变成了一团糟。' },
  solution: { en: 'Transform each check into a standalone class with a single method performing the check. Link these handlers into a chain. Each handler has a reference to the next handler. A handler can either process the request or pass it along. The request travels along the chain until all handlers have had a chance to process it.', cn: '将每个检查转换为具有执行检查的单一方法的独立类。将这些处理者链接成链。每个处理者都有对下一个处理者的引用。处理者可以处理请求或传递它。请求沿着链传递，直到所有处理者都有机会处理它。' },
  codeIntro: { en: 'GUI contextual help: pressing F1 sends a request up the component tree until a component with help text is found.', cn: 'GUI 上下文帮助：按 F1 将请求沿组件树向上发送，直到找到有帮助文本的组件。' },
  pseudocode: `interface ComponentWithContextualHelp is
    method showHelp()

abstract class Component implements ComponentWithContextualHelp is
    field tooltipText: string
    protected field container: Container

    method showHelp() is
        if (tooltipText != null)
            // Show tooltip
        else if (container != null)
            container.showHelp()

abstract class Container extends Component is
    protected field children: array of Component

    method add(child) is
        children.add(child)
        child.container = this

class Button extends Component is
    // ...

class Panel extends Container is
    field modalHelpText: string
    method showHelp() is
        if (modalHelpText != null)
            // Show a modal window with help text
        else
            super.showHelp()

class Dialog extends Container is
    field wikiPageURL: string
    method showHelp() is
        if (wikiPageURL != null)
            // Open the wiki help page
        else
            super.showHelp()

// Client code
class Application is
    method createUI() is
        dialog = new Dialog("Budget Reports")
        dialog.wikiPageURL = "http://..."
        panel = new Panel(0, 0, 400, 800)
        panel.modalHelpText = "This panel does..."
        ok = new Button(250, 760, "OK")
        ok.tooltipText = "This is an OK button that..."
        panel.add(ok)
        dialog.add(panel)

    // When user presses F1 on the OK button:
    // Button -> Panel (has help) -> shows modal`,
  pros: [
    { en: 'Control the order of request handling.', cn: '控制请求处理的顺序。' },
    { en: '<strong>Single Responsibility.</strong> Decouple classes that invoke operations from classes that perform operations.', cn: '<strong>单一职责原则。</strong>将调用操作的类与执行操作的类解耦。' },
    { en: '<strong>Open/Closed.</strong> Introduce new handlers without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新的处理者。' }
  ],
  cons: [
    { en: 'Some requests may end up unhandled.', cn: '某些请求可能最终未被处理。' }
  ]
},

{
  id: 15, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Command',
  subtitle: { en: 'Request as object / Action / Transaction', cn: '命令 / 请求对象化' },
  description: { en: 'Turns a request into a stand-alone object that contains all information about the request. This lets you parameterize methods with different requests, delay or queue a request\'s execution, and support undoable operations.', cn: '将请求转变为包含请求所有信息的独立对象。这让你能用不同的请求来参数化方法、延迟或排队请求的执行，以及支持可撤销的操作。' },
  problem: { en: 'You\'re building a text editor with a toolbar. Buttons in the toolbar trigger different operations (Copy, Cut, Paste). Multiple UI elements might trigger the same operation (button, menu item, keyboard shortcut). You don\'t want to duplicate the operation code in every UI class.', cn: '你正在构建一个带工具栏的文本编辑器。工具栏中的按钮触发不同操作（复制、剪切、粘贴）。多个 UI 元素可能触发相同操作（按钮、菜单项、快捷键）。你不想在每个 UI 类中重复操作代码。' },
  solution: { en: 'Turn each operation into a command object. The command object stores all the information needed to perform the action, including a reference to the receiver. The GUI element delegates work to the command. For undo, commands save state before execution.', cn: '将每个操作转换为命令对象。命令对象存储执行操作所需的所有信息，包括对接收者的引用。GUI 元素将工作委派给命令。对于撤销，命令在执行前保存状态。' },
  codeIntro: { en: 'Text editor with undo support: commands record history and can restore editor state.', cn: '支持撤销的文本编辑器：命令记录历史并可恢复编辑器状态。' },
  pseudocode: `abstract class Command is
    protected field app: Application
    protected field editor: Editor
    protected field backup: text

    constructor Command(app: Application, editor: Editor) is
        this.app = app
        this.editor = editor

    method saveBackup() is
        backup = editor.text

    method undo() is
        editor.text = backup

    abstract method execute()

class CopyCommand extends Command is
    method execute() is
        app.clipboard = editor.getSelection()

class CutCommand extends Command is
    method execute() is
        saveBackup()
        app.clipboard = editor.getSelection()
        editor.deleteSelection()

class PasteCommand extends Command is
    method execute() is
        saveBackup()
        editor.replaceSelection(app.clipboard)

class UndoCommand extends Command is
    method execute() is
        app.undo()

// Command history for undo support
class CommandHistory is
    private field history: array of Command
    method push(c: Command) is
        history.add(c)
    method pop(): Command is
        return history.removeLast()

class Application is
    field clipboard: string
    field editors: array of Editor
    field activeEditor: Editor
    field history: CommandHistory

    method executeCommand(command) is
        if (command.execute())
            history.push(command)

    method undo() is
        command = history.pop()
        if (command != null)
            command.undo()`,
  pros: [
    { en: '<strong>Single Responsibility.</strong> Decouple classes that invoke operations from classes that perform them.', cn: '<strong>单一职责原则。</strong>将调用操作的类与执行操作的类解耦。' },
    { en: '<strong>Open/Closed.</strong> Introduce new commands without breaking existing code.', cn: '<strong>开闭原则。</strong>无需破坏现有代码即可引入新命令。' },
    { en: 'Implement undo/redo, deferred execution, and operation queuing.', cn: '实现撤销/重做、延迟执行和操作排队。' },
    { en: 'Assemble a set of simple commands into a complex one.', cn: '将一组简单命令组合成复杂命令。' }
  ],
  cons: [
    { en: 'The code may become more complicated since you\'re adding a new layer between senders and receivers.', cn: '代码可能变得更复杂，因为你在发送者和接收者之间添加了新层。' }
  ]
},

{
  id: 16, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Iterator',
  subtitle: { en: 'Sequential access', cn: '迭代器 / 顺序访问' },
  description: { en: 'Lets you traverse elements of a collection without exposing its underlying representation (list, stack, tree, etc.).', cn: '让你遍历集合的元素而不暴露其底层表示（列表、栈、树等）。' },
  problem: { en: 'Collections are the most-used data types. But how do you traverse a complex collection (tree, graph)? Different clients may need different traversal approaches (depth-first, breadth-first). Adding more traversal algorithms to the collection bloats its primary responsibility.', cn: '集合是最常用的数据类型。但如何遍历复杂集合（树、图）？不同客户端可能需要不同的遍历方式（深度优先、广度优先）。向集合添加更多遍历算法会使其主要职责膨胀。' },
  solution: { en: 'Extract the traversal behavior into a separate object called an <strong>iterator</strong>. The iterator encapsulates the traversal details and provides a simple interface (getNext, hasMore). Different iterators can implement different traversal algorithms for the same collection.', cn: '将遍历行为提取到称为<strong>迭代器</strong>的独立对象中。迭代器封装遍历细节并提供简单接口（getNext、hasMore）。不同迭代器可以为同一集合实现不同的遍历算法。' },
  codeIntro: { en: 'Social network iterators: traverse friends on different platforms (WeChat, LinkedIn) through a unified interface.', cn: '社交网络迭代器：通过统一接口遍历不同平台（微信、LinkedIn）上的好友。' },
  pseudocode: `interface SocialNetwork is
    method createFriendsIterator(profileId): ProfileIterator
    method createCoworkersIterator(profileId): ProfileIterator

class WeChat implements SocialNetwork is
    // ... lots of collection data ...
    method createFriendsIterator(profileId) is
        return new WeChatIterator(this, profileId, "friends")
    method createCoworkersIterator(profileId) is
        return new WeChatIterator(this, profileId, "coworkers")

interface ProfileIterator is
    method getNext(): Profile
    method hasMore(): boolean

class WeChatIterator implements ProfileIterator is
    private field weChat: WeChat
    private field profileId, type: string
    private field currentPosition: int
    private field cache: array of Profile

    constructor WeChatIterator(weChat, profileId, type) is
        this.weChat = weChat
        this.profileId = profileId
        this.type = type

    private method lazyInit() is
        if (cache == null)
            cache = weChat.socialGraphRequest(profileId, type)

    method getNext(): Profile is
        if (hasMore())
            result = cache[currentPosition]
            currentPosition++
            return result

    method hasMore(): boolean is
        lazyInit()
        return currentPosition < cache.length

// Client code
class SocialSpammer is
    method send(iterator: ProfileIterator, message: string) is
        while (iterator.hasMore()) do
            profile = iterator.getNext()
            System.sendEmail(profile.getEmail(), message)`,
  pros: [
    { en: '<strong>Single Responsibility.</strong> Clean up client code and collections by extracting bulky traversal algorithms into separate classes.', cn: '<strong>单一职责原则。</strong>通过将庞大的遍历算法提取到独立类中来整理客户端代码和集合。' },
    { en: '<strong>Open/Closed.</strong> Implement new types of collections and iterators and pass them to existing code.', cn: '<strong>开闭原则。</strong>实现新的集合和迭代器类型并将它们传递给现有代码。' },
    { en: 'Iterate over the same collection in parallel, because each iterator object contains its own iteration state.', cn: '可以并行遍历同一集合，因为每个迭代器对象都包含自己的迭代状态。' }
  ],
  cons: [
    { en: 'Overkill if your app only works with simple collections.', cn: '如果应用只处理简单集合，应用该模式可能矫枉过正。' },
    { en: 'Using an iterator may be less efficient than going through elements directly for some specialized collections.', cn: '对于某些特殊集合，使用迭代器可能不如直接遍历元素高效。' }
  ]
},

{
  id: 17, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Mediator',
  subtitle: { en: 'Central hub / Controller', cn: '中介者 / 通信中枢' },
  description: { en: 'Lets you reduce chaotic dependencies between objects. The pattern restricts direct communications between objects and forces them to collaborate only via a mediator object.', cn: '让你减少对象之间混乱的依赖关系。该模式限制对象之间的直接通信，强制它们仅通过中介者对象协作。' },
  problem: { en: 'You have a dialog with many UI elements (text fields, buttons, checkboxes) that interact with each other. For example, checking "I have a dog" shows a text field for the dog\'s name. Elements become tightly coupled, making them hard to reuse.', cn: '你有一个包含许多 UI 元素（文本框、按钮、复选框）的对话框，它们相互交互。例如，选中"我有一只狗"会显示输入狗名字的文本框。元素变得紧密耦合，难以复用。' },
  solution: { en: 'Cease all direct communication between components and make them collaborate indirectly via a mediator object. Components only depend on a single mediator class instead of being coupled to dozens of their colleagues. The dialog class itself acts as the mediator.', cn: '停止组件之间的所有直接通信，让它们通过中介者对象间接协作。组件只依赖于单一中介者类，而不是与数十个同事耦合。对话框类本身充当中介者。' },
  codeIntro: { en: 'Authentication dialog as mediator between UI components (buttons, textboxes, checkboxes).', cn: '认证对话框作为 UI 组件（按钮、文本框、复选框）之间的中介者。' },
  pseudocode: `interface Mediator is
    method notify(sender: Component, event: string)

class AuthenticationDialog implements Mediator is
    private field title: string
    private field loginOrRegisterChkBx: Checkbox
    private field loginUsername, loginPassword: Textbox
    private field registrationUsername, registrationPassword,
                  registrationEmail: Textbox
    private field okBtn, cancelBtn: Button

    constructor AuthenticationDialog() is
        // Create all component objects and pass the current
        // mediator to their constructors to establish links.

    method notify(sender, event) is
        if (sender == loginOrRegisterChkBx and event == "check")
            if (loginOrRegisterChkBx.checked)
                title = "Log in"
                // 1. Show login form components
                // 2. Hide registration form components
            else
                title = "Register"
                // 1. Show registration form components
                // 2. Hide login form components

        if (sender == okBtn and event == "click")
            if (loginOrRegister.checked)
                // Try to find a user using login credentials
                if (not found)
                    // Show error above the login field
            else
                // Create user account using registration fields
                // Log the user in

class Component is
    field dialog: Mediator
    constructor Component(dialog) is
        this.dialog = dialog
    method click() is
        dialog.notify(this, "click")
    method keypress() is
        dialog.notify(this, "keypress")`,
  pros: [
    { en: '<strong>Single Responsibility.</strong> Extract communications between components into a single place.', cn: '<strong>单一职责原则。</strong>将组件间的通信提取到一处。' },
    { en: '<strong>Open/Closed.</strong> Introduce new mediators without changing the actual components.', cn: '<strong>开闭原则。</strong>无需更改实际组件即可引入新的中介者。' },
    { en: 'Reduce coupling between various components.', cn: '减少各组件之间的耦合。' },
    { en: 'Reuse individual components more easily.', cn: '更容易复用各个组件。' }
  ],
  cons: [
    { en: 'Over time a mediator can evolve into a God Object.', cn: '随着时间推移，中介者可能演变成上帝对象。' }
  ]
},

{
  id: 18, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Memento',
  subtitle: { en: 'Snapshot / Undo', cn: '备忘录 / 快照' },
  description: { en: 'Lets you save and restore the previous state of an object without revealing the details of its implementation.', cn: '让你保存和恢复对象的先前状态，而不暴露其实现细节。' },
  problem: { en: 'You\'re building a text editor with undo. To save state before each operation, you need to copy all private fields &mdash; but most objects would hide their internals behind private fields. And even if they were public, future refactoring would break your snapshot code.', cn: '你正在构建一个支持撤销的文本编辑器。要在每次操作前保存状态，你需要复制所有私有字段——但大多数对象会将其内部状态隐藏在私有字段后面。即使它们是公有的，将来的重构也会破坏你的快照代码。' },
  solution: { en: 'Let the originator itself produce the snapshot (memento) of its state. Only the originator can access the memento\'s state. A caretaker stores the mementos, but can\'t tamper with their contents.', cn: '让发起人自身生成其状态的快照（备忘录）。只有发起人可以访问备忘录的状态。看护人存储备忘录，但不能篡改其内容。' },
  codeIntro: { en: 'Text editor creates state snapshots before each operation for undo support.', cn: '文本编辑器在每次操作前创建状态快照以支持撤销。' },
  pseudocode: `class Editor is
    private field text, curX, curY, selectionWidth: string

    method setText(text) is
        this.text = text

    method setCursor(x, y) is
        this.curX = x
        this.curY = y

    method setSelectionWidth(width) is
        this.selectionWidth = width

    method createSnapshot(): Snapshot is
        // Memento is an immutable object; pass state via constructor
        return new Snapshot(this, text, curX, curY, selectionWidth)

class Snapshot is
    private field editor: Editor
    private field text, curX, curY, selectionWidth

    constructor Snapshot(editor, text, curX, curY, selectionWidth) is
        this.editor = editor
        this.text = text
        this.curX = curX
        this.curY = curY
        this.selectionWidth = selectionWidth

    method restore() is
        editor.setText(text)
        editor.setCursor(curX, curY)
        editor.setSelectionWidth(selectionWidth)

// Caretaker: a command object can act as caretaker
class Command is
    private field backup: Snapshot

    method makeBackup() is
        backup = editor.createSnapshot()

    method undo() is
        if (backup != null)
            backup.restore()`,
  pros: [
    { en: 'Produce snapshots of object state without violating its encapsulation.', cn: '在不违反封装的情况下生成对象状态的快照。' },
    { en: 'Simplify the originator\'s code by letting the caretaker maintain the history of mementos.', cn: '让看护人维护备忘录历史来简化发起人的代码。' }
  ],
  cons: [
    { en: 'The app might consume lots of RAM if clients create mementos too often.', cn: '如果客户端过于频繁地创建备忘录，应用可能消耗大量 RAM。' },
    { en: 'Caretakers should track the originator\'s lifecycle to be able to destroy obsolete mementos.', cn: '看护人应该跟踪发起人的生命周期以便销毁过时的备忘录。' }
  ]
},

{
  id: 19, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Observer',
  subtitle: { en: 'Event subscription / Listener', cn: '观察者 / 事件订阅' },
  description: { en: 'Defines a subscription mechanism to notify multiple objects about any events that happen to the object they\'re observing.', cn: '定义一种订阅机制，以便在被观察对象发生事件时通知多个其他对象。' },
  problem: { en: 'Customer and Store: customers want to know when a product arrives. They could visit daily (wasteful), or the store could spam everyone (annoying). Neither approach is ideal.', cn: '顾客和商店：顾客想知道产品何时到货。他们可以每天去查看（浪费），或商店通知所有人（打扰）。两种方法都不理想。' },
  solution: { en: 'Add a subscription mechanism to the publisher: 1) a list storing subscriber references, 2) methods to add/remove subscribers. When an event occurs, the publisher traverses the list and calls each subscriber\'s notification method via a common interface.', cn: '为发布者添加订阅机制：1）存储订阅者引用的列表，2）添加/删除订阅者的方法。事件发生时，发布者遍历列表并通过通用接口调用每个订阅者的通知方法。' },
  codeIntro: { en: 'Text editor notifies service objects (logging, email) about state changes via an event manager.', cn: '文本编辑器通过事件管理器将状态变化通知给服务对象（日志、邮件提醒）。' },
  pseudocode: `// Publisher base class
class EventManager is
    private field listeners: hash map of event types and listeners

    method subscribe(eventType, listener) is
        listeners.add(eventType, listener)

    method unsubscribe(eventType, listener) is
        listeners.remove(eventType, listener)

    method notify(eventType, data) is
        foreach (listener in listeners.of(eventType)) do
            listener.update(data)

// Concrete publisher
class Editor is
    public field events: EventManager
    private field file: File

    constructor Editor() is
        events = new EventManager()

    method openFile(path) is
        this.file = new File(path)
        events.notify("open", file.name)

    method saveFile() is
        file.write()
        events.notify("save", file.name)

// Subscriber interface
interface EventListener is
    method update(filename)

class LoggingListener implements EventListener is
    private field log: File, message: string
    method update(filename) is
        log.write(replace('%s', filename, message))

class EmailAlertsListener implements EventListener is
    private field email: string, message: string
    method update(filename) is
        system.email(email, replace('%s', filename, message))

// Client configures publishers and subscribers
class Application is
    method config() is
        editor = new Editor()
        logger = new LoggingListener("/path/to/log.txt",
            "Someone opened: %s")
        editor.events.subscribe("open", logger)
        emailAlerts = new EmailAlertsListener("admin@example.com",
            "Someone changed: %s")
        editor.events.subscribe("save", emailAlerts)`,
  pros: [
    { en: '<strong>Open/Closed.</strong> Introduce new subscriber classes without changing the publisher.', cn: '<strong>开闭原则。</strong>无需修改发布者代码就能引入新的订阅者类。' },
    { en: 'Establish relations between objects at runtime.', cn: '可以在运行时建立对象之间的联系。' }
  ],
  cons: [
    { en: 'Subscribers are notified in random order.', cn: '订阅者的通知顺序是随机的。' }
  ]
},

{
  id: 20, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'State',
  subtitle: { en: 'Behavior changes with state', cn: '状态 / 行为随状态改变' },
  description: { en: 'Lets an object alter its behavior when its internal state changes. It appears as if the object changed its class.', cn: '当对象的内部状态改变时改变其行为，看起来就像对象改变了其类。' },
  problem: { en: 'The State pattern is closely related to Finite State Machines. A Document can be in Draft, Moderation, or Published state &mdash; the <code>publish()</code> method behaves differently in each. Instead of bloated <code>switch</code> statements, create separate classes for each state.', cn: '状态模式与有限状态机概念紧密相关。文档可处于草稿、审阅中或已发布状态——<code>publish()</code>方法在每种状态下行为不同。与其使用臃肿的<code>switch</code>语句，不如为每种状态创建独立的类。' },
  solution: { en: 'Create a class for each possible state and extract all state-specific behavior into them. The original object (context) stores a reference to the current state object and delegates all state-related work to it. To transition, replace the current state object with another one.', cn: '为每种可能的状态创建类，并将所有特定于状态的行为提取到其中。原始对象（上下文）存储对当前状态对象的引用，并将所有与状态相关的工作委派给它。要转换状态，替换当前状态对象即可。' },
  codeIntro: { en: 'Audio player whose controls behave differently in Locked, Ready, and Playing states.', cn: '音频播放器：控件在锁定、就绪和播放状态下行为不同。' },
  pseudocode: `class AudioPlayer is
    field state: State
    field UI, volume, playlist, currentSong

    constructor AudioPlayer() is
        this.state = new ReadyState(this)
        UI = new UserInterface()
        UI.lockButton.onClick(this.clickLock)
        UI.playButton.onClick(this.clickPlay)
        UI.nextButton.onClick(this.clickNext)
        UI.prevButton.onClick(this.clickPrevious)

    method changeState(state: State) is
        this.state = state

    // UI methods delegate to current state
    method clickLock() is  state.clickLock()
    method clickPlay() is  state.clickPlay()
    method clickNext() is  state.clickNext()
    method clickPrevious() is  state.clickPrevious()

abstract class State is
    protected field player: AudioPlayer
    constructor State(player) is
        this.player = player
    abstract method clickLock()
    abstract method clickPlay()
    abstract method clickNext()
    abstract method clickPrevious()

class LockedState extends State is
    method clickLock() is
        if (player.playing)
            player.changeState(new PlayingState(player))
        else
            player.changeState(new ReadyState(player))
    method clickPlay() is   // locked, do nothing
    method clickNext() is   // locked, do nothing
    method clickPrevious() is   // locked, do nothing

class ReadyState extends State is
    method clickLock() is
        player.changeState(new LockedState(player))
    method clickPlay() is
        player.startPlayback()
        player.changeState(new PlayingState(player))
    method clickNext() is  player.nextSong()
    method clickPrevious() is  player.previousSong()

class PlayingState extends State is
    method clickLock() is
        player.changeState(new LockedState(player))
    method clickPlay() is
        player.stopPlayback()
        player.changeState(new ReadyState(player))
    method clickNext() is  player.nextSong()
    method clickPrevious() is  player.previousSong()`,
  pros: [
    { en: '<strong>Single Responsibility.</strong> Organize state-specific code into separate classes.', cn: '<strong>单一职责原则。</strong>将特定于状态的代码组织到独立的类中。' },
    { en: '<strong>Open/Closed.</strong> Introduce new states without changing existing state classes or context.', cn: '<strong>开闭原则。</strong>无需修改现有状态类或上下文就能引入新状态。' },
    { en: 'Simplify context code by eliminating bulky state machine conditionals.', cn: '通过消除臃肿的状态机条件语句来简化上下文代码。' }
  ],
  cons: [
    { en: 'Can be overkill if a state machine has only a few states or rarely changes.', cn: '如果状态机只有很少的状态或很少变化，可能矫枉过正。' }
  ]
},

{
  id: 21, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Strategy',
  subtitle: { en: 'Interchangeable algorithms', cn: '策略 / 可互换算法' },
  description: { en: 'Defines a family of algorithms, encapsulates each one, and makes them interchangeable. Strategy lets the algorithm vary independently from clients that use it.', cn: '定义一系列算法，将每个算法封装起来，并使它们可以互换。让算法独立于使用它的客户端而变化。' },
  problem: { en: 'Building a navigation app: initially only driving routes. Then walking, public transport, cycling, sightseeing&hellip; Each new algorithm doubles the main class size, and any change risks breaking existing code. Team members get merge conflicts modifying the same giant class.', cn: '开发导航应用：最初只有驾车路线。后来添加步行、公交、骑行、观光……每增加一个算法，主类体积翻倍，任何修改都有破坏已有代码的风险。团队成员修改同一个巨大类时产生合并冲突。' },
  solution: { en: 'Extract each algorithm into its own class (strategy). The context holds a reference to a strategy object and delegates work via a common interface, letting you swap algorithms at runtime.', cn: '将每个算法提取到独立的类（策略）中。上下文持有策略对象的引用并通过通用接口委派工作，从而可在运行时替换算法。' },
  codeIntro: { en: 'The context uses multiple strategies to execute different arithmetic operations.', cn: '上下文使用多个策略来执行不同的计算操作。' },
  pseudocode: `interface Strategy is
    method execute(a, b)

class ConcreteStrategyAdd implements Strategy is
    method execute(a, b) is
        return a + b

class ConcreteStrategySubtract implements Strategy is
    method execute(a, b) is
        return a - b

class ConcreteStrategyMultiply implements Strategy is
    method execute(a, b) is
        return a * b

// Context doesn't know which strategy it uses
class Context is
    private strategy: Strategy

    method setStrategy(Strategy strategy) is
        this.strategy = strategy

    method executeStrategy(a, b) is
        return strategy.execute(a, b)

// Client picks and passes the strategy
class ExampleApplication is
    method main() is
        // Create context, read numbers & action from user

        if (action == addition) then
            context.setStrategy(new ConcreteStrategyAdd())
        if (action == subtraction) then
            context.setStrategy(new ConcreteStrategySubtract())
        if (action == multiplication) then
            context.setStrategy(new ConcreteStrategyMultiply())

        result = context.executeStrategy(firstNumber, secondNumber)`,
  pros: [
    { en: 'Swap algorithms inside an object at runtime.', cn: '可以在运行时切换对象内的算法。' },
    { en: 'Isolate implementation details of an algorithm from the code that uses it.', cn: '将算法实现细节与使用代码隔离。' },
    { en: 'Replace inheritance with composition.', cn: '用组合代替继承。' },
    { en: '<strong>Open/Closed.</strong> Introduce new strategies without modifying the context.', cn: '<strong>开闭原则。</strong>无需修改上下文即可引入新策略。' }
  ],
  cons: [
    { en: 'Overkill if algorithms rarely change &mdash; extra classes and interfaces for no benefit.', cn: '如果算法极少变化，额外的类和接口无益处，矫枉过正。' },
    { en: 'Clients must know the differences between strategies to pick the right one.', cn: '客户端必须了解策略之间的差异才能选择合适的策略。' }
  ]
},

{
  id: 22, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Template Method',
  subtitle: { en: 'Algorithm skeleton', cn: '模板方法 / 算法骨架' },
  description: { en: 'Defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure.', cn: '在超类中定义算法的骨架，但允许子类在不改变算法结构的情况下重写特定步骤。' },
  problem: { en: 'Building a data-mining app that processes DOC, CSV, PDF files. Three parsing classes contain much duplicate code &mdash; data processing and analysis logic is nearly identical, only file-specific parsing differs.', cn: '构建处理 DOC、CSV、PDF 文件的数据挖掘应用。三个解析类包含大量重复代码——数据处理和分析逻辑几乎相同，只有文件特定的解析不同。' },
  solution: { en: 'Decompose the algorithm into steps. Make some abstract (subclasses must implement), and give others default implementations. A "hook" is an optional step with an empty body &mdash; subclasses can override it for extra extension points.', cn: '将算法分解为步骤。某些步骤是抽象的（子类必须实现），其他步骤有默认实现。"钩子"是内容为空的可选步骤——子类可重写它以获得额外的扩展点。' },
  codeIntro: { en: 'Strategy game AI: different races override specific steps of the game turn algorithm.', cn: '策略游戏 AI：不同种族重写游戏回合算法的特定步骤。' },
  pseudocode: `class GameAI is
    // Template method defines the algorithm skeleton
    method turn() is
        collectResources()
        buildStructures()
        buildUnits()
        attack()

    // Some steps have default implementations
    method collectResources() is
        foreach (s in this.builtStructures) do
            s.collect()

    // Some steps are abstract
    abstract method buildStructures()
    abstract method buildUnits()

    method attack() is
        enemy = closestEnemy()
        if (enemy == null)
            sendScouts(map.center)
        else
            sendWarriors(enemy.position)

    abstract method sendScouts(position)
    abstract method sendWarriors(position)

// Concrete class implements all abstract steps
class OrcsAI extends GameAI is
    method buildStructures() is
        if (there are some resources) then
            // Build farms, then barns, then fortress
    method buildUnits() is
        if (there are plenty of resources) then
            if (there are no scouts)
                // Build peon, add to scouts group
            else
                // Build grunt, add to warriors group
    method sendScouts(position) is
        if (scouts.length > 0) then
            // Send scouts to position
    method sendWarriors(position) is
        if (warriors.length > 5) then
            // Send warriors to position

// Subclasses can override default steps too
class MonstersAI extends GameAI is
    method collectResources() is  // Monsters don't collect
    method buildStructures() is   // Monsters don't build
    method buildUnits() is        // Monsters don't build units`,
  pros: [
    { en: 'Let clients override only certain parts of a large algorithm.', cn: '让客户端仅重写大型算法的特定部分。' },
    { en: 'Pull duplicate code into a superclass.', cn: '将重复代码提取到超类中。' }
  ],
  cons: [
    { en: 'Some clients may be limited by the provided algorithm skeleton.', cn: '部分客户端可能受到算法框架的限制。' },
    { en: 'Suppressing a default step via subclass may violate Liskov Substitution Principle.', cn: '通过子类抑制默认步骤可能违反里氏替换原则。' },
    { en: 'The more steps the algorithm has, the harder it is to maintain.', cn: '算法步骤越多，维护越困难。' }
  ]
},

{
  id: 23, type: 'pattern', part: 'Behavioral Patterns',
  category: 'behavioral', categoryLabel: { en: 'Behavioral', cn: '行为型' },
  title: 'Visitor',
  subtitle: { en: 'Separate algorithms from objects', cn: '访问者 / 分离算法与对象' },
  description: { en: 'Lets you separate algorithms from the objects on which they operate, by placing each algorithm into a separate class called a visitor.', cn: '通过将每个算法放入称为"访问者"的独立类中，将算法与其所作用的对象分离。' },
  problem: { en: 'You have a geographic graph with City, Industry, SightSeeing nodes and need to export it to XML. But the architect refuses to modify the stable node classes. Adding export logic into each node class violates Single Responsibility and risks breaking existing code.', cn: '你有一个包含城市、工业区、旅游景点节点的地理图，需要导出为 XML。但架构师拒绝修改稳定的节点类。向每个节点类添加导出逻辑违反单一职责原则，并有破坏现有代码的风险。' },
  solution: { en: 'Place the new behavior into a separate visitor class. Using <strong>double dispatch</strong>, each element "accepts" a visitor and calls the correct visitor method: <code>node.accept(visitor)</code> internally calls <code>visitor.visitCity(this)</code>. This lets you add new operations without touching the element hierarchy.', cn: '将新行为放入独立的访问者类中。使用<strong>双分派</strong>技巧，每个元素"接收"访问者并调用正确的访问者方法：<code>node.accept(visitor)</code> 内部调用 <code>visitor.visitCity(this)</code>。这让你在不修改元素层次结构的情况下添加新操作。' },
  codeIntro: { en: 'Adding XML export to a shape hierarchy using double dispatch.', cn: '使用双分派为形状层次结构添加 XML 导出支持。' },
  pseudocode: `// Element interface
interface Shape is
    method move(x, y)
    method draw()
    method accept(v: Visitor)

class Dot implements Shape is
    method accept(v: Visitor) is
        v.visitDot(this)

class Circle implements Shape is
    method accept(v: Visitor) is
        v.visitCircle(this)

class Rectangle implements Shape is
    method accept(v: Visitor) is
        v.visitRectangle(this)

class CompoundShape implements Shape is
    method accept(v: Visitor) is
        v.visitCompoundShape(this)

// Visitor interface
interface Visitor is
    method visitDot(d: Dot)
    method visitCircle(c: Circle)
    method visitRectangle(r: Rectangle)
    method visitCompoundShape(cs: CompoundShape)

// Concrete visitor
class XMLExportVisitor implements Visitor is
    method visitDot(d: Dot) is
        // Export dot's ID and center coordinates
    method visitCircle(c: Circle) is
        // Export circle's ID, center, and radius
    method visitRectangle(r: Rectangle) is
        // Export rectangle's ID, top-left, width, height
    method visitCompoundShape(cs: CompoundShape) is
        // Export shape's ID and list of children IDs

// Client code
class Application is
    field allShapes: array of Shapes
    method export() is
        exportVisitor = new XMLExportVisitor()
        foreach (shape in allShapes) do
            shape.accept(exportVisitor)`,
  pros: [
    { en: '<strong>Open/Closed.</strong> Introduce new behaviors for different classes without modifying them.', cn: '<strong>开闭原则。</strong>无需修改类即可引入在不同类上执行的新行为。' },
    { en: '<strong>Single Responsibility.</strong> Move multiple versions of same behavior into one class.', cn: '<strong>单一职责原则。</strong>将同一行为的不同版本移到同一个类中。' },
    { en: 'A visitor can accumulate useful info while working with various objects (e.g., traversing a tree).', cn: '访问者在与各种对象交互时可收集有用信息（例如遍历对象树）。' }
  ],
  cons: [
    { en: 'You need to update all visitors each time a class is added/removed from the element hierarchy.', cn: '每次在元素层次结构中添加或移除类时，都要更新所有访问者。' },
    { en: 'Visitors might lack access to private fields and methods of the elements they work with.', cn: '访问者可能没有访问元素私有字段和方法的权限。' }
  ]
}

];
