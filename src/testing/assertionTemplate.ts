import select from './support/selector';
import { isWNode, isVNode, decorate } from '../widget-core/d';
import { VNode, WNode, DNode } from '../widget-core/interfaces';

export interface AssertionTemplateResult {
	(): DNode | DNode[];
	setChildren(selector: string, children: DNode[], type?: 'prepend' | 'replace' | 'append'): AssertionTemplateResult;
	setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
	getChildren(selector: string): DNode[];
	getProperty(selector: string, property: string): any;
}

const findOne = (nodes: DNode | DNode[], selector: string): DNode | undefined => {
	let finalSelector = selector;
	if (selector.indexOf('~') === 0) {
		finalSelector = `[\\~key='${selector.substr(1)}']`;
	}
	let [node] = select(finalSelector, nodes);
	if (!node) {
		finalSelector = `[assertion-key='${selector.substr(1)}']`;
		[node] = select(finalSelector, nodes);
	}
	return node;
};

type NodeWithProperties = (VNode | WNode) & { properties: { [index: string]: any } };

const guard = (node: DNode): NodeWithProperties => {
	if (!node) {
		throw Error('Node not found');
	}
	if (!isWNode(node) && !isVNode(node)) {
		throw Error('Cannot set or get on unknown node');
	}
	return node;
};

export function assertionTemplate(renderFunc: () => DNode | DNode[]) {
	const assertionTemplateResult: any = () => {
		const render = renderFunc();
		decorate(render, (node) => {
			if (isWNode(node) || isVNode(node)) {
				delete (node as NodeWithProperties).properties['~key'];
				delete (node as NodeWithProperties).properties['assertion-key'];
			}
		});
		return render;
	};
	assertionTemplateResult.setProperty = (selector: string, property: string, value: any) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		node.properties[property] = value;
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.setChildren = (
		selector: string,
		children: DNode[],
		type: 'prepend' | 'replace' | 'append' = 'replace'
	) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		node.children = node.children || [];
		switch (type) {
			case 'prepend':
				node.children = [...children, ...node.children];
				break;
			case 'append':
				node.children = [...node.children, ...children];
				break;
			case 'replace':
				node.children = [...children];
				break;
		}
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.getProperty = (selector: string, property: string) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		return node.properties[property];
	};
	assertionTemplateResult.getChildren = (selector: string) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		return node.children || [];
	};
	return assertionTemplateResult as AssertionTemplateResult;
}

export default assertionTemplate;
