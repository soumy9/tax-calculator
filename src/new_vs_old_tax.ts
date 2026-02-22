const formatterConstructor = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
	minimumFractionDigits: 0,
});

const currencyFormatter = (num: number) => {
	return formatterConstructor.format(num);
};

type TableCells = {
	annualIncome: number;
	taxableIncome: number;
	taxOnSalary: number;
	cess: number;
	totalTax: number;
	"pf employee contribution": number;
	totalDeductions: number;
	professionalTax: number,
	"monthly in-hand": number;
	"annual in-hand": number;
	"annual bonus": number;
	"annual in-hand + bonus": number;
}

type Regime = {
	taxSlabs: number[][];
	standardDeduction: number;
	taxRebateLimit: number;
	exemption80c: number;
	exemptionHRA: number;
	exemption80dSelf: number;
	exemption80dSenior: number;
	taxableSalary: number;
}

type FormDataFields = {
	unit: 'monthly' | 'annual'
	basic: number;
	hra: number;
	sp_all: number;
	bonus: number;
	totalOtherAllowances: number;
	inv_80c: number;
	inv_80e: number;
	inv_80d: number;
	rentPaid: number;
	professionalTax: number;
}

class Investments {
	elss: number;
	employeePf: number;
	medicalInsurance: number;
	educationLoanInterest: number;

	constructor(elss: number, employeePf: number, medicalInsurance: number, educationLoanInterest: number) {
		this.elss = elss;
		this.employeePf = employeePf;
		this.medicalInsurance = medicalInsurance;
		this.educationLoanInterest = educationLoanInterest;
	}
}

class IncomeTax {
	taxableSalary: number;
	taxSlabs: number[][];
	standardDeduction: number;
	taxRebateLimit: number;
	salary: Salary;
	investments: Investments;
	cess = 0.04;
	professionalTax: number;

	constructor(taxSlabs: number[][], standardDeduction: number, taxRebateLimit: number, salary: Salary, investments: Investments, professionalTax: number, isExemptionAllowed: boolean) {
		this.taxSlabs = taxSlabs;
		this.standardDeduction = standardDeduction;
		this.taxRebateLimit = taxRebateLimit;
		this.professionalTax = professionalTax;
		this.taxableSalary = salary.gross_sal - this.standardDeduction;
		if (isExemptionAllowed) {
			const exemptionHRA = Math.round(
				Math.min(
					salary.hra,
					salary.basic * 0.4,
					Math.max(salary.rent_paid - 0.1 * salary.basic, 0)
				)
			);
			this.taxableSalary -= (exemptionHRA
				+ Math.min(investments.elss + investments.employeePf, 150e3)
				+ investments.educationLoanInterest
				+ investments.medicalInsurance);
		}
		this.salary = salary;
		this.investments = investments;
	}

	calculateTax(): number {
		if (this.taxableSalary <= this.taxRebateLimit) return 0;
		let incomeTax = 0;
		for (let i = 0; i < this.taxSlabs.length - 1; i++) {
			if (this.taxSlabs[i]?.length !== 2) return 0;
			const lower_limit = this.taxSlabs[i]?.[0] ?? 0;
			const rate = this.taxSlabs[i]?.[1] ?? 0;
			if (lower_limit > this.taxableSalary) break;
			const upperLimit = Math.min(
				this.taxableSalary,
				this.taxSlabs[i + 1]?.[0] ?? 0
			);
			incomeTax = incomeTax + (upperLimit - lower_limit) * rate;
		}
		return incomeTax;
	}

	getTaxComputations(): TableCells {
		const taxComputations: TableCells = {
			annualIncome: 0,
			taxableIncome: 0,
			taxOnSalary: 0,
			cess: 0,
			totalTax: 0,
			"pf employee contribution": 0,
			totalDeductions: 0,
			professionalTax: 0,
			"monthly in-hand": 0,
			"annual in-hand": 0,
			"annual bonus": 0,
			"annual in-hand + bonus": 0,
		};
		const newTax = this.calculateTax();
		taxComputations["annualIncome"] = this.salary.gross_sal;
		taxComputations["taxableIncome"] = this.taxableSalary;
		taxComputations["taxOnSalary"] = Math.round(newTax);
		taxComputations["cess"] = Math.round(newTax * this.cess);
		taxComputations["totalTax"] =
			taxComputations["taxOnSalary"] + taxComputations["cess"];
		taxComputations["pf employee contribution"] =
			this.investments.employeePf;
		taxComputations["totalDeductions"] =
			taxComputations["totalTax"] +
			this.investments.employeePf +
			this.professionalTax;
		taxComputations["professionalTax"] = this.professionalTax;
		const annualInHand = this.salary.gross_sal - taxComputations["totalDeductions"];
		taxComputations["monthly in-hand"] = Math.round(
			(annualInHand - this.salary.variable_cmp) / 12
		);
		taxComputations["annual in-hand"] = annualInHand;
		taxComputations["annual bonus"] = this.salary.variable_cmp;
		taxComputations["annual in-hand + bonus"] = taxComputations["annual in-hand"] + taxComputations["annual bonus"];
		console.log(`new tax: `, taxComputations);
		return taxComputations;
	}
}

const NEW_TAX: Regime = {
	taxSlabs: [
		[0, 0],
		[4e5, 0.05],
		[8e5, 0.1],
		[12e5, 0.15],
		[16e5, 0.2],
		[20e5, 0.25],
		[24e5, 0.3],
		[Number.POSITIVE_INFINITY, 0],
	],
	standardDeduction: 75e3,
	taxRebateLimit: 12e5,
	exemption80c: 0,
	exemptionHRA: 0,
	exemption80dSelf: 0,
	exemption80dSenior: 0,
	taxableSalary: 0
};

const OLD_TAX: Regime = {
	taxSlabs: [
		[0, 0],
		[2.5e5, 0.05],
		[5e5, 0.2],
		[10e5, 0.3],
		[Number.POSITIVE_INFINITY, 0],
	],
	standardDeduction: 50e3,
	taxRebateLimit: 5e5,
	exemption80c: 1.5e5,
	exemptionHRA: 0,
	exemption80dSelf: 25e3,
	exemption80dSenior: 50e3,
	taxableSalary: 0
};

class Salary {
	basic: number;
	hra: number;
	sp_all: number;
	gross_sal: number;
	pf_employee_contribution: number;
	rent_paid: number;
	variable_cmp: number;
	fixed_cmp: number;

	constructor(
		basic: number,
		hra: number,
		sp_all: number,
		totalOtherAllowances: number,
		bonus: number,
		rentPaid: number
	) {
		this.basic = basic;
		this.hra = hra;
		this.sp_all = sp_all;
		this.variable_cmp = bonus;
		this.fixed_cmp = basic + hra + sp_all + totalOtherAllowances;
		this.gross_sal = this.fixed_cmp + bonus;
		this.rent_paid = rentPaid;
		this.pf_employee_contribution = Math.round(0.12 * this.basic);
	}
}

function getFormValues<T extends Record<string, any>>(
	formData: FormData
): T {
	const data = {} as T;

	for (const [key, value] of formData.entries()) {
		data[key as keyof T] = Number(value) as T[keyof T];
	}

	return data;
}

document.addEventListener('DOMContentLoaded', () => {
	const table = document.getElementById("calculation-table") as HTMLTableElement;
	const form = document.querySelector('form');
	form?.addEventListener('submit', formSubmitHandler);
	function updateTable(rowLabel: string, parameters: TableCells) {
		const row = table?.insertRow(table.rows.length);
		const rowLabelCell = row.insertCell(0);
		rowLabelCell.innerText = rowLabel;
		let i = 1;
		for (const value of Object.values(parameters)) {
			row.insertCell(i++).innerText = currencyFormatter(value);
		}
	}
	function clearTableData() {
		//clear previous data from table
		while (table.rows.length > 1) {
			table.deleteRow(1);
		}
	}
	function formSubmitHandler(e: any) {
		e.preventDefault();
		clearTableData();
		const formData = new FormData(e.currentTarget);
		const data = getFormValues<FormDataFields>(formData);

		const {
			basic = 0,
			hra = 0,
			sp_all = 0,
			bonus = 0,
			inv_80c = 0,
			inv_80e = 0,
			inv_80d = 0,
			rentPaid = 0,
			professionalTax = 0,
			totalOtherAllowances = 0,
			unit
		} = data;

		// const [basicTemp,
		// 	hraTemp,
		// 	sp_allTemp,
		// 	totalOtherAllowancesTemp,
		// 	bonusTemp,
		// 	inv_80cTemp,
		// 	inv_80eTemp,
		// 	inv_80dTemp] = [49426.07 * 12, 19770.43 * 12, 54667.84 * 12, 6425.39 * 12, 0, 1.5e5, 0, 40e3];
		// const newSal3 = new Salary(
		// 	basicTemp,
		// 	hraTemp,
		// 	sp_allTemp,
		// 	totalOtherAllowancesTemp,
		// 	bonusTemp,
		// 	rentPaid
		// );
		const multiplier = unit === 'annual' ? 1 : 12;

		const newSal3 = new Salary(
			basic * multiplier,
			hra * multiplier,
			sp_all * multiplier,
			totalOtherAllowances * multiplier,
			bonus * multiplier,
			rentPaid * multiplier
		);
		const investments = new Investments(inv_80c, newSal3.pf_employee_contribution, inv_80d, inv_80e);
		const newRegimeTax = new IncomeTax(NEW_TAX.taxSlabs, NEW_TAX.standardDeduction, NEW_TAX.taxRebateLimit, newSal3, investments, professionalTax * multiplier, false);
		const oldRegimeTax = new IncomeTax(OLD_TAX.taxSlabs, OLD_TAX.standardDeduction, OLD_TAX.taxRebateLimit, newSal3, investments, professionalTax * multiplier, true);

		updateTable("New Tax Scheme", newRegimeTax.getTaxComputations());
		updateTable("Old Tax Scheme", oldRegimeTax.getTaxComputations());
	}
});