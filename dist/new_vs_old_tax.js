"use strict";
const formatterConstructor = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
});
const currencyFormatter = (num) => {
    return formatterConstructor.format(num);
};
class Investments {
    constructor(elss, employeePf, medicalInsurance, educationLoanInterest) {
        this.elss = elss;
        this.employeePf = employeePf;
        this.medicalInsurance = medicalInsurance;
        this.educationLoanInterest = educationLoanInterest;
    }
}
class IncomeTax {
    constructor(taxSlabs, standardDeduction, taxRebateLimit, salary, investments, professionalTax, isExemptionAllowed) {
        this.cess = 0.04;
        this.taxSlabs = taxSlabs;
        this.standardDeduction = standardDeduction;
        this.taxRebateLimit = taxRebateLimit;
        this.professionalTax = professionalTax;
        this.taxableSalary = salary.gross_sal - this.standardDeduction;
        if (isExemptionAllowed) {
            const exemptionHRA = Math.round(Math.min(salary.hra, salary.basic * 0.4, Math.max(salary.rent_paid - 0.1 * salary.basic, 0)));
            this.taxableSalary -= (exemptionHRA
                + Math.min(investments.elss + investments.employeePf, 150e3)
                + investments.educationLoanInterest
                + investments.medicalInsurance);
        }
        this.salary = salary;
        this.investments = investments;
    }
    calculateTax() {
        if (this.taxableSalary <= this.taxRebateLimit)
            return 0;
        let incomeTax = 0;
        for (let i = 0; i < this.taxSlabs.length - 1; i++) {
            if (this.taxSlabs[i]?.length !== 2)
                return 0;
            const lower_limit = this.taxSlabs[i]?.[0] ?? 0;
            const rate = this.taxSlabs[i]?.[1] ?? 0;
            if (lower_limit > this.taxableSalary)
                break;
            const upperLimit = Math.min(this.taxableSalary, this.taxSlabs[i + 1]?.[0] ?? 0);
            incomeTax = incomeTax + (upperLimit - lower_limit) * rate;
        }
        return incomeTax;
    }
    getTaxComputations() {
        const taxComputations = {
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
        taxComputations["monthly in-hand"] = Math.round((annualInHand - this.salary.variable_cmp) / 12);
        taxComputations["annual in-hand"] = annualInHand;
        taxComputations["annual bonus"] = this.salary.variable_cmp;
        taxComputations["annual in-hand + bonus"] = taxComputations["annual in-hand"] + taxComputations["annual bonus"];
        console.log(`new tax: `, taxComputations);
        return taxComputations;
    }
}
const NEW_TAX = {
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
const OLD_TAX = {
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
    constructor(basic, hra, sp_all, totalOtherAllowances, bonus, rentPaid) {
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
function getFormValues(formData) {
    const data = {};
    for (const [key, value] of formData.entries()) {
        const cleanValue = value.toString().replace(',', '');
        data[key] = Number(cleanValue);
    }
    return data;
}
document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById("calculation-table");
    const form = document.querySelector('form');
    form?.addEventListener('submit', formSubmitHandler);
    function updateTable(rowLabel, parameters) {
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
    function formSubmitHandler(e) {
        e.preventDefault();
        clearTableData();
        const formData = new FormData(e.currentTarget);
        const data = getFormValues(formData);
        const { basic = 0, hra = 0, sp_all = 0, bonus = 0, inv_80c = 0, inv_80e = 0, inv_80d = 0, rentPaid = 0, professionalTax = 0, totalOtherAllowances = 0, unit } = data;
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
        const multiplier = unit;
        const newSal3 = new Salary(basic * multiplier, hra * multiplier, sp_all * multiplier, totalOtherAllowances * multiplier, bonus * multiplier, rentPaid * multiplier);
        const investments = new Investments(inv_80c, newSal3.pf_employee_contribution, inv_80d, inv_80e);
        const newRegimeTax = new IncomeTax(NEW_TAX.taxSlabs, NEW_TAX.standardDeduction, NEW_TAX.taxRebateLimit, newSal3, investments, professionalTax * multiplier, false);
        const oldRegimeTax = new IncomeTax(OLD_TAX.taxSlabs, OLD_TAX.standardDeduction, OLD_TAX.taxRebateLimit, newSal3, investments, professionalTax * multiplier, true);
        updateTable("New Tax Scheme", newRegimeTax.getTaxComputations());
        updateTable("Old Tax Scheme", oldRegimeTax.getTaxComputations());
    }
});
//# sourceMappingURL=new_vs_old_tax.js.map